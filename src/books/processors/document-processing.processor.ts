import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { S3Service } from '../../s3/s3.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { PDFParse } from 'pdf-parse';

@Processor('document-processing')
export class DocumentProcessingProcessor {
  private readonly logger = new Logger(DocumentProcessingProcessor.name);

  constructor(
    private readonly aiService: AiService,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Process('generate-embedding')
  async handleGenerateEmbedding(job: Job<{ bookId: string; title: string; description?: string }>) {
    const { bookId, title, description } = job.data;
    this.logger.log(`Processing embedding & summarization job for Book ID ${bookId}: "${title}"`);
    
    try {
      // 1. Fetch book record from DB to retrieve S3 file key
      const book = await this.prisma.book.findUnique({
        where: { id: bookId },
        select: { fileUrl: true },
      });

      let extractedText = '';
      if (book && book.fileUrl) {
        try {
          this.logger.log(`Downloading PDF file from S3 key: "${book.fileUrl}"`);
          const fileBuffer = await this.s3Service.downloadFile(book.fileUrl);
          
          this.logger.log('Extracting text from PDF buffer...');
          const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
          try {
            const pdfData = await parser.getText();
            extractedText = pdfData.text || '';
            this.logger.log(`Extracted ${extractedText.length} characters from PDF.`);
          } finally {
            await parser.destroy();
          }
        } catch (pdfErr: any) {
          this.logger.error(`PDF text extraction failed for Book ${bookId}: ${pdfErr.message}. Falling back to metadata.`);
        }
      }

      // 2. Perform Summarization & Artifact Generation (Map-Reduce)
      let summary = description || '';
      let tags: string[] = [];
      let keyConcepts: string[] = [];

      const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
      const apiKey = geminiApiKey || this.configService.get<string>('OPENAI_API_KEY');
      
      if (!apiKey) {
        this.logger.warn('Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured. Using mock summarization artifacts.');
        summary = `[Mock Summary] This is a mock 3-paragraph summary of the book "${title}". It covers the primary themes of the book. Paragraph 2 explains the methodology. Paragraph 3 concludes the study.`;
        tags = ['Mock', 'Digital Library', 'AI Summary', 'Reading', 'Education'];
        keyConcepts = ['Automation', 'Digitization', 'Information Retrieval'];
      } else {
        const isGemini = !!geminiApiKey;
        const model = new ChatOpenAI({
          modelName: isGemini ? 'gemini-2.5-flash-lite' : 'gpt-4o-mini',
          temperature: 0.1,
          apiKey: apiKey,
          openAIApiKey: apiKey,
          maxRetries: 1, // Fail fast on rate limits so BullMQ retry spacing can take over
          ...(isGemini && {
            configuration: {
              baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
            },
          }),
        });

        const FinalAnalysisSchema = z.object({
          summary: z.string().describe("A concise, well-structured 3-paragraph summary of the book."),
          tags: z.array(z.string()).describe("A list of 5 to 10 SEO-friendly tags representing genres, topics, or themes."),
          keyConcepts: z.array(z.string()).describe("Identify key concepts present in the book (max 10 concepts)."),
        });

        // Check if text is large enough to warrant Map-Reduce chunking
        if (extractedText.length > 10000) {
          this.logger.log('Running Map-Reduce summarization chain...');
          const chunks = this.splitTextIntoChunks(extractedText, 8000, 500);
          this.logger.log(`Split text into ${chunks.length} chunks. Executing Map phase...`);

          const mapPromises = chunks.map(async (chunk, idx) => {
            const prompt = [
              new SystemMessage({
                content: 'Summarize the key information, themes, and narrative points of this portion of a book. Write a 1-paragraph summary.'
              }),
              new HumanMessage({ content: chunk }),
            ];
            const res = await model.invoke(prompt);
            return typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
          });

          const chunkSummaries = await Promise.all(mapPromises);
          this.logger.log('Map phase completed. Executing Reduce phase...');

          const combinedSummaries = chunkSummaries.join('\n\n');
          const structuredModel = model.withStructuredOutput(FinalAnalysisSchema);
          const analysis = await structuredModel.invoke([
            new SystemMessage({
              content: `You are an expert literary analyst and metadata editor. Below are chunk summaries of a book titled "${title}".
              Combine them into a consolidated metadata package containing a 3-paragraph summary, SEO-friendly tags, and key concepts.
              
              Summaries context:
              """
              ${combinedSummaries}
              """`
            }),
            new HumanMessage({ content: `Generate the final metadata analysis for "${title}".` })
          ]);

          summary = analysis.summary;
          tags = analysis.tags;
          keyConcepts = analysis.keyConcepts;
        } else {
          // Direct single LLM analysis for small text
          this.logger.log('Running direct single-page summarization...');
          const contextText = extractedText || description || `Title: ${title}\nDescription: ${description || ''}`;
          
          const structuredModel = model.withStructuredOutput(FinalAnalysisSchema);
          const analysis = await structuredModel.invoke([
            new SystemMessage({
              content: `You are an expert literary analyst. Read this text from the book titled "${title}".
              Generate a 3-paragraph summary, 5-10 SEO-friendly tags, and identify key concepts present in the book.
              
              Text context:
              """
              ${contextText}
              """`
            }),
            new HumanMessage({ content: `Generate the final metadata analysis for "${title}".` })
          ]);

          summary = analysis.summary;
          tags = analysis.tags;
          keyConcepts = analysis.keyConcepts;
        }
      }

      this.logger.log(`Generated summary: "${summary.substring(0, 100)}..."`);
      this.logger.log(`Generated tags: ${JSON.stringify(tags)}`);
      this.logger.log(`Generated key concepts: ${JSON.stringify(keyConcepts)}`);

      // 3. Save artifacts (summary, tags, keyConcepts) to database
      this.logger.log('Updating book record in database with generated artifacts...');
      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          description: summary,
          tags: tags,
          keyConcepts: keyConcepts,
        },
      });

      // 4. Update the book vector embeddings using the new summary
      this.logger.log('Updating book vector embeddings...');
      await this.aiService.updateBookEmbedding(bookId, title, summary);
      
      this.logger.log(`Successfully processed embedding & summarization job for Book ID ${bookId}`);
    } catch (error: any) {
      this.logger.error(`Failed to process embedding & summarization job for Book ID ${bookId}: ${error.message}`);
      throw error;
    }
  }

  // Text splitting helper
  private splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      const end = Math.min(i + chunkSize, text.length);
      chunks.push(text.slice(i, end));
      if (end === text.length) break;
      i += chunkSize - overlap;
    }
    return chunks;
  }
}


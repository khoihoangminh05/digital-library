import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly openai: OpenAI | null = null;
  private readonly logger = new Logger(AiService.name);

  private readonly isGemini: boolean = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    const apiKey = geminiApiKey || this.configService.get<string>('OPENAI_API_KEY');

    if (apiKey) {
      this.isGemini = !!geminiApiKey;
      this.openai = new OpenAI({
        apiKey,
        ...(this.isGemini && {
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        }),
      });
      this.logger.log(`OpenAI/Gemini Client successfully initialized for Embeddings (${this.isGemini ? 'Gemini' : 'OpenAI'}).`);
    } else {
      this.logger.warn('Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured. Using mock zero-vectors.');
    }
  }

  /**
   * Generates a 1536-dimensional vector embedding for a given text.
   * Fallbacks to a mock zero-vector if no API key is configured.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      this.logger.warn('Mocking embedding generation (no API key configured)');
      return new Array(1536).fill(0);
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.isGemini ? 'gemini-embedding-001' : 'text-embedding-ada-002',
        input: text,
      });

      const embedding = response.data[0].embedding;

      if (this.isGemini) {
        // Handle Gemini 3072 or 768 dimensional outputs mapping to 1536 pgvector
        if (embedding.length > 1536) {
          return embedding.slice(0, 1536);
        } else if (embedding.length < 1536) {
          const padded = new Array(1536).fill(0);
          for (let i = 0; i < embedding.length; i++) {
            padded[i] = embedding[i];
          }
          return padded;
        }
      }

      return embedding;
    } catch (error: any) {
      this.logger.error(`AI embedding failed: ${error.message}`);
      throw new InternalServerErrorException(`AI embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generates embedding for a book's title and description,
   * then updates the pgvector embedding column in PostgreSQL.
   */
  async updateBookEmbedding(id: string, title: string, description?: string | null): Promise<void> {
    const text = `Title: ${title}\nDescription: ${description || ''}`;
    const embedding = await this.generateEmbedding(text);
    const vectorStr = `[${embedding.join(',')}]`;
    
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "books" SET embedding = $1::vector WHERE id = $2::uuid`,
        vectorStr,
        id,
      );
      this.logger.log(`Embedding updated successfully for Book ID: ${id}`);
    } catch (error: any) {
      this.logger.error(`Database embedding update failed for Book ID ${id}: ${error.message}`);
      throw new InternalServerErrorException(`Database vector sync failed: ${error.message}`);
    }
  }
}

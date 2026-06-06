import { Injectable, Logger, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BooksService } from '../books/books.service';
import { StateGraph, Annotation, messagesStateReducer, START, END } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

// 1. Define the LangGraph State Annotation
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  nextAgent: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'router',
  }),
});

@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name);
  private graph: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly booksService: BooksService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Multi-Agent LangGraph StateGraph...');
    
    // 2. Define the StateGraph Workflow
    const workflow = new StateGraph(AgentState)
      .addNode('router', this.routerNode.bind(this))
      .addNode('librarian', this.librarianNode.bind(this))
      .addNode('researcher', this.researcherNode.bind(this));

    workflow
      .addEdge(START, 'router')
      .addConditionalEdges(
        'router',
        (state) => state.nextAgent,
        {
          librarian: 'librarian',
          researcher: 'researcher',
          end: END,
        }
      )
      .addEdge('librarian', END)
      .addEdge('researcher', END);

    this.graph = workflow.compile();
    this.logger.log('LangGraph StateGraph successfully compiled.');
  }

  private getModel(temperature = 0): ChatOpenAI | null {
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    const apiKey = geminiApiKey || this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      return null;
    }

    const isGemini = !!geminiApiKey;
    return new ChatOpenAI({
      modelName: isGemini ? 'gemini-2.5-flash' : 'gpt-4o-mini',
      temperature,
      apiKey: apiKey,
      openAIApiKey: apiKey,
      ...(isGemini && {
        configuration: {
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        },
      }),
    });
  }

  /**
   * Router Node: Analyzes conversation context and decides to route
   * to Librarian Agent, Researcher Agent, or answer greetings directly.
   */
  private async routerNode(state: typeof AgentState.State) {
    this.logger.log('Routing agent starting analysis...');
    const messages = state.messages;
    const model = this.getModel(0);

    if (!model) {
      this.logger.warn('Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured. Router defaulting to direct mock greeting.');
      return {
        messages: [new AIMessage({ content: 'Hello! I am running in mock mode. Please set your GEMINI_API_KEY or OPENAI_API_KEY to test the full Multi-Agent system.' })],
        nextAgent: 'end',
      };
    }

    const RouterResponseSchema = z.object({
      nextAgent: z.enum(['librarian', 'researcher', 'direct'])
        .describe(
          "Select 'librarian' if the user asks for book recommendations, matching books to moods, genres, or abstract descriptions. " +
          "Select 'researcher' if the user asks general knowledge questions, questions about facts, scientific concepts, or searches involving summaries of books. " +
          "Select 'direct' only for general greetings (hi, hello, etc.), chit-chat, or off-topic queries."
        ),
      directResponse: z.string().optional()
        .describe("If nextAgent is 'direct', provide a polite greeting or simple chit-chat response here. Otherwise, leave this blank."),
    });

    try {
      const modelWithStructure = model.withStructuredOutput(RouterResponseSchema);
      const result = await modelWithStructure.invoke(messages);

      this.logger.log(`Router decision: route to [${result.nextAgent}]`);

      if (result.nextAgent === 'direct') {
        return {
          messages: [new AIMessage({ content: result.directResponse || 'Hi there! How can I help you today?' })],
          nextAgent: 'end',
        };
      }

      return {
        nextAgent: result.nextAgent,
      };
    } catch (err: any) {
      this.logger.error(`Router Agent failed: ${err.message}. Routing to librarian as fallback.`);
      return {
        nextAgent: 'librarian',
      };
    }
  }

  /**
   * Librarian Node: Specialized in semantic search using pgvector
   * to recommend books based on user mood, categories, or abstract descriptions.
   */
  private async librarianNode(state: typeof AgentState.State) {
    this.logger.log('Librarian Agent generating recommendations...');
    const messages = state.messages;
    const lastUserMessage = [...messages].reverse().find(m => this.getMessageType(m) === 'human')?.content || '';
    const model = this.getModel(0.2);

    if (!model) {
      return {
        messages: [new AIMessage({ content: 'Librarian Agent (Mock): Here is a general recommendation: "Crime and Punishment" by Fyodor Dostoevsky matches introspective or heavy moods.' })],
        nextAgent: 'end',
      };
    }

    // 1. Refine the query optimized for semantic search
    const QueryExtractionSchema = z.object({
      searchQuery: z.string().describe("A refined search query (max 10 words) focused strictly on core thematic concepts, mood, and categories to match books in our vector database."),
    });

    let refinedQuery = typeof lastUserMessage === 'string' ? lastUserMessage : '';
    try {
      const extractor = model.withStructuredOutput(QueryExtractionSchema);
      const extracted = await extractor.invoke([
        new SystemMessage({ content: 'Extract a search query optimized for vector similarity search based on user mood and book genre preferences.' }),
        ...messages,
      ]);
      refinedQuery = extracted.searchQuery;
      this.logger.log(`Librarian refined vector search query: "${refinedQuery}"`);
    } catch (e: any) {
      this.logger.warn(`Failed to refine librarian query: ${e.message}. Using raw query.`);
    }

    // 2. Query books database via pgvector
    const books = await this.booksService.semanticSearch(refinedQuery);
    this.logger.log(`Librarian database lookup found ${books.length} books.`);

    // 3. Format and answer
    const context = books.map(b => 
      `- Title: ${b.title}\n  Author: ${b.author}\n  Category: ${b.category}\n  Description: ${b.description}\n  Similarity Match: ${(b.similarity * 100).toFixed(1)}%`
    ).join('\n\n');

    const prompt = [
      new SystemMessage({
        content: `You are the Librarian Agent for our Digital Library. Your specialty is helping users find books that match their mood, tone, abstract ideas, or specific tastes.
        
        Here are the most relevant books fetched from our vector database for the query "${refinedQuery}":
        ${context || 'No books found matching this concept in our database.'}
        
        Introduce these recommendations to the user in a friendly, engaging manner. Explain exactly why they fit the user's mood or request. Encourage them to read them. If no relevant books were found, politely state that and suggest broad topics or alternatives.`
      }),
      ...messages,
    ];

    const response = await model.invoke(prompt);
    return {
      messages: [response],
      nextAgent: 'end',
    };
  }

  /**
   * Researcher Node: Specialized in answering general knowledge questions,
   * supplementing summaries of books in our database when applicable.
   */
  private async researcherNode(state: typeof AgentState.State) {
    this.logger.log('Researcher Agent researching topic...');
    const messages = state.messages;
    const lastUserMessage = [...messages].reverse().find(m => this.getMessageType(m) === 'human')?.content || '';
    const model = this.getModel(0.2);

    if (!model) {
      return {
        messages: [new AIMessage({ content: 'Researcher Agent (Mock): The theory of relativity explains the physical laws governing gravity and spacetime.' })],
        nextAgent: 'end',
      };
    }

    // 1. Refine query to search for related reading material in our library
    const QueryExtractionSchema = z.object({
      searchQuery: z.string().describe("A concise keyword or short phrase (max 5 words) to search our database for books containing related knowledge."),
    });

    let refinedQuery = typeof lastUserMessage === 'string' ? lastUserMessage : '';
    try {
      const extractor = model.withStructuredOutput(QueryExtractionSchema);
      const extracted = await extractor.invoke([
        new SystemMessage({ content: 'Identify a search term to find books in our database related to the user\'s question.' }),
        ...messages,
      ]);
      refinedQuery = extracted.searchQuery;
      this.logger.log(`Researcher refined library search query: "${refinedQuery}"`);
    } catch (e: any) {
      this.logger.warn(`Failed to refine researcher query: ${e.message}. Using raw query.`);
    }

    // 2. Query books database
    const books = await this.booksService.semanticSearch(refinedQuery);
    this.logger.log(`Researcher database lookup found ${books.length} books.`);

    // 3. Answer combining external knowledge + database summaries
    const context = books.map(b => 
      `- Title: ${b.title}\n  Author: ${b.author}\n  Description: ${b.description}`
    ).join('\n\n');

    const prompt = [
      new SystemMessage({
        content: `You are the Researcher Agent. Your job is to answer general knowledge questions accurately.
        You should answer the question comprehensively using your broad external training data.
        Additionally, you MUST cross-reference and cite relevant book summaries present in our digital library database if they correspond to the topic.
        
        Here are the related books found in our database:
        ${context || 'No directly related books were found in our library catalog.'}
        
        Answer the user's question. If books are listed above, integrate them naturally (e.g., "For further reading, John Doe's 'Intro to Science' in our catalog covers..."). If no books match, answer the question anyway based on your knowledge.`
      }),
      ...messages,
    ];

    const response = await model.invoke(prompt);
    return {
      messages: [response],
      nextAgent: 'end',
    };
  }

  /**
   * Helper method to invoke the compiled graph with client inputs
   * and parse inputs/outputs to simple JSON-compatible formats.
   */
  async chat(message: string, history: { role: string; content: string }[] = []) {
    const formattedHistory = this.mapHistoryToMessages(history);
    const userMessage = new HumanMessage({ content: message });
    const inputs = {
      messages: [...formattedHistory, userMessage],
    };

    try {
      const finalState = await this.graph.invoke(inputs);
      const allMessages = finalState.messages as BaseMessage[];
      
      // Get the last AI response message
      const aiResponse = [...allMessages].reverse().find(m => this.getMessageType(m) === 'ai');
      const responseText = aiResponse ? (typeof aiResponse.content === 'string' ? aiResponse.content : JSON.stringify(aiResponse.content)) : 'No response generated.';
      
      const updatedHistory = this.mapMessagesToHistory(allMessages);
      const finalAgent = finalState.nextAgent;

      return {
        response: responseText,
        history: updatedHistory,
        nextAgent: finalAgent,
      };
    } catch (err: any) {
      this.logger.error(`Failed to execute LangGraph chat: ${err.message}`);
      throw new InternalServerErrorException(`AI Agent chat execution failed: ${err.message}`);
    }
  }

  // Mapping Helpers
  private mapHistoryToMessages(history: { role: string; content: string }[]): BaseMessage[] {
    return history.map(h => {
      if (h.role === 'user') {
        return new HumanMessage({ content: h.content });
      } else if (h.role === 'assistant') {
        return new AIMessage({ content: h.content });
      } else {
        return new SystemMessage({ content: h.content });
      }
    });
  }

  private mapMessagesToHistory(messages: BaseMessage[]): { role: string; content: string }[] {
    return messages.map(m => {
      const type = this.getMessageType(m);
      let role = 'user';
      if (type === 'ai') {
        role = 'assistant';
      } else if (type === 'system') {
        role = 'system';
      }
      return {
        role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      };
    });
  }

  private getMessageType(message: BaseMessage): string {
    if (typeof message.getType === 'function') {
      return message.getType();
    }
    const type = (message as any)._getType;
    if (typeof type === 'function') {
      return (message as any)._getType();
    }
    if (typeof type === 'string') {
      return type;
    }
    const name = message.constructor?.name?.toLowerCase();
    if (name?.includes('human')) return 'human';
    if (name?.includes('ai')) return 'ai';
    if (name?.includes('system')) return 'system';
    return 'human';
  }

  /**
   * AI Tutor logic. Explains highlighted text strictly using the text as context.
   */
  async tutor(bookId: string, highlightedText: string, question: string) {
    this.logger.log(`AI Tutor explaining passage for book ${bookId}...`);
    
    // Fetch book details for context
    let bookTitle = 'Publication';
    let bookAuthor = 'Unknown';
    try {
      const book = await this.booksService.findOne(bookId);
      if (book) {
        bookTitle = book.title;
        bookAuthor = book.author;
      }
    } catch (e: any) {
      this.logger.warn(`Could not fetch book details: ${e.message}`);
    }

    const model = this.getModel(0);
    if (!model) {
      this.logger.warn('Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured. AI Tutor returning mock response.');
      return {
        response: `[Mock AI Tutor] Explaining selected passage from "${bookTitle}" by ${bookAuthor}: "${highlightedText}".\n\nYour question: "${question}".\n\nMock Answer: This text refers to key elements in the chapter. Please set your GEMINI_API_KEY or OPENAI_API_KEY in the backend to enable actual AI explanations.`,
      };
    }

    const prompt = [
      new SystemMessage({
        content: `You are an Interactive AI Tutor helper. The student is reading the book "${bookTitle}" by ${bookAuthor}.
        
        They have highlighted the following passage from the book:
        """
        ${highlightedText}
        """
        
        Instruction:
        Explain the text and answer the student's question ONLY using the provided highlighted text as strict context.
        Do NOT extrapolate, and do NOT use any external knowledge to answer, unless it is directly and unambiguously supported by the text.
        If the highlighted text does not contain enough information to answer the question, politely explain that you cannot answer based on the provided passage.`
      }),
      new HumanMessage({ content: question }),
    ];

    try {
      const result = await model.invoke(prompt);
      const responseText = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
      return { response: responseText };
    } catch (err: any) {
      this.logger.error(`AI Tutor failed: ${err.message}`);
      throw new InternalServerErrorException(`AI Tutor execution failed: ${err.message}`);
    }
  }
}

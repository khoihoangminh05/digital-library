import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { AiService } from '../ai/ai.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly aiService: AiService,
    @InjectQueue('document-processing')
    private readonly documentQueue: Queue,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async create(
    createBookDto: CreateBookDto,
    coverFile?: Express.Multer.File,
    bookFile?: Express.Multer.File,
  ) {
    let coverUrl = createBookDto.coverUrl;
    let fileUrl = createBookDto.fileUrl;

    if (coverFile) {
      coverUrl = await this.s3Service.uploadFile(coverFile, 'covers');
    }

    if (bookFile) {
      fileUrl = await this.s3Service.uploadFile(bookFile, 'books');
    }

    const book = await this.prisma.book.create({
      data: {
        ...createBookDto,
        coverUrl,
        fileUrl,
      },
    });

    // Invalidate books list cache
    try {
      await this.cacheManager.clear();
    } catch (err: any) {
      console.error(`Failed to clear cache during book creation: ${err.message}`);
    }

    // Queue embedding generation job
    try {
      await this.documentQueue.add(
        'generate-embedding',
        {
          bookId: book.id,
          title: book.title,
          description: book.description,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
    } catch (error: any) {
      console.error(`Failed to queue embedding job on creation: ${error.message}`);
      // Fallback to synchronous generation
      try {
        await this.aiService.updateBookEmbedding(book.id, book.title, book.description);
      } catch (innerErr: any) {
        console.error(`Synchronous fallback embedding generation failed: ${innerErr.message}`);
      }
    }

    return book;
  }

  async findAll(opts: {
    search?: string;
    category?: string;
    sortBy?: string;
    order?: string;
    page?: number;
    limit?: number;
    paginated?: boolean;
  } = {}) {
    const { search, category, paginated } = opts;
    const where: any = {};

    if (category && category !== 'All') {
      where.category = {
        contains: category,
        mode: 'insensitive',
      };
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          author: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Whitelist sortable columns to avoid invalid Prisma ordering
    const allowedSort = ['createdAt', 'title', 'author'];
    const sortBy = allowedSort.includes(opts.sortBy || '') ? (opts.sortBy as string) : 'createdAt';
    const order = opts.order === 'asc' ? 'asc' : 'desc';
    const orderBy = { [sortBy]: order };

    const select = {
      id: true,
      title: true,
      author: true,
      description: true,
      coverUrl: true,
      fileUrl: true,
      category: true,
      tags: true,
      keyConcepts: true,
      createdAt: true,
      updatedAt: true,
    };

    const resolveCovers = async (books: any[]) =>
      Promise.all(
        books.map(async (book) => {
          let presignedCover: string | null = null;
          if (book.coverUrl) {
            try {
              presignedCover = await this.s3Service.getPresignedDownloadUrl(book.coverUrl, 3600);
            } catch (error: any) {
              console.error(`Failed to generate pre-signed URL for cover: ${error.message}`);
            }
          }
          return { ...book, coverUrl: presignedCover || book.coverUrl };
        }),
      );

    if (paginated) {
      const page = Math.max(1, opts.page || 1);
      const limit = Math.min(60, Math.max(1, opts.limit || 9));
      const [total, books] = await Promise.all([
        this.prisma.book.count({ where }),
        this.prisma.book.findMany({
          where,
          select,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);
      const items = await resolveCovers(books);
      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    const books = await this.prisma.book.findMany({ where, select, orderBy });
    return resolveCovers(books);
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        coverUrl: true,
        fileUrl: true,
        category: true,
        tags: true,
        keyConcepts: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    let presignedCover: string | null = null;
    if (book.coverUrl) {
      try {
        presignedCover = await this.s3Service.getPresignedDownloadUrl(book.coverUrl, 3600);
      } catch (error: any) {
        console.error(`Failed to generate pre-signed URL for cover: ${error.message}`);
      }
    }

    return {
      ...book,
      coverUrl: presignedCover || book.coverUrl,
    };
  }

  async update(
    id: string,
    updateBookDto: UpdateBookDto,
    coverFile?: Express.Multer.File,
    bookFile?: Express.Multer.File,
  ) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    let coverUrl = book.coverUrl;
    let fileUrl = book.fileUrl;

    if (coverFile) {
      if (book.coverUrl) {
        try {
          await this.s3Service.deleteFile(book.coverUrl);
        } catch (error: any) {
          console.error(`Failed to delete old S3 cover file during update: ${error.message}`);
        }
      }
      coverUrl = await this.s3Service.uploadFile(coverFile, 'covers');
    }

    if (bookFile) {
      if (book.fileUrl) {
        try {
          await this.s3Service.deleteFile(book.fileUrl);
        } catch (error: any) {
          console.error(`Failed to delete old S3 book file during update: ${error.message}`);
        }
      }
      fileUrl = await this.s3Service.uploadFile(bookFile, 'books');
    }

    // Exclude coverUrl and fileUrl from updateBookDto if sent, to avoid database S3 key corruption
    const { coverUrl: _, fileUrl: __, ...metadata } = updateBookDto;

    const updatedBook = await this.prisma.book.update({
      where: { id },
      data: {
        ...metadata,
        coverUrl,
        fileUrl,
      },
    });

    // Invalidate books list cache
    try {
      await this.cacheManager.clear();
    } catch (err: any) {
      console.error(`Failed to clear cache during book update: ${err.message}`);
    }

    // Regenerate embedding if title or description changes
    if (metadata.title !== undefined || metadata.description !== undefined) {
      try {
        await this.documentQueue.add(
          'generate-embedding',
          {
            bookId: id,
            title: updatedBook.title,
            description: updatedBook.description,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        );
      } catch (error: any) {
        console.error(`Failed to queue embedding job on update: ${error.message}`);
        // Fallback to synchronous generation
        try {
          await this.aiService.updateBookEmbedding(id, updatedBook.title, updatedBook.description);
        } catch (innerErr: any) {
          console.error(`Synchronous fallback embedding generation failed: ${innerErr.message}`);
        }
      }
    }

    return updatedBook;
  }

  async remove(id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    if (book.coverUrl) {
      try {
        await this.s3Service.deleteFile(book.coverUrl);
      } catch (error: any) {
        console.error(`Failed to delete S3 cover file during removal: ${error.message}`);
      }
    }

    if (book.fileUrl) {
      try {
        await this.s3Service.deleteFile(book.fileUrl);
      } catch (error: any) {
        console.error(`Failed to delete S3 book file during removal: ${error.message}`);
      }
    }

    // Invalidate books list cache
    try {
      await this.cacheManager.clear();
    } catch (err: any) {
      console.error(`Failed to clear cache during book removal: ${err.message}`);
    }

    return this.prisma.book.delete({
      where: { id },
    });
  }

  /**
   * Fetches the S3 file path key of a book and generates a temporary pre-signed GET URL.
   * @param id The UUID of the book.
   * @returns Pre-signed URL payload.
   */
  async getFileUrl(id: string): Promise<{ url: string }> {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: {
        fileUrl: true,
      },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    if (!book.fileUrl) {
      throw new BadRequestException(`Book with ID ${id} does not have an attached S3 publication file`);
    }

    // Generate pre-signed URL valid for 900 seconds (15 minutes)
    const presignedUrl = await this.s3Service.getPresignedDownloadUrl(book.fileUrl, 900);
    return { url: presignedUrl };
  }

  /**
   * Fetches the S3 file buffer to stream locally.
   * @param id The UUID of the book.
   */
  async getFileBuffer(id: string): Promise<{ buffer: Buffer; fileName: string }> {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: {
        fileUrl: true,
      },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    if (!book.fileUrl) {
      throw new BadRequestException(`Book with ID ${id} does not have an attached S3 publication file`);
    }

    const buffer = await this.s3Service.downloadFile(book.fileUrl);
    const fileName = book.fileUrl.split('/').pop() || 'book.pdf';
    return { buffer, fileName };
  }

  /**
   * Generates query embedding and runs pgvector cosine similarity search (<=>).
   * Returns top 5 closest matching books with pre-signed cover URLs resolved.
   */
  async semanticSearch(query: string) {
    // 1. Generate search query embedding
    const embedding = await this.aiService.generateEmbedding(query);
    const vectorStr = `[${embedding.join(',')}]`;

    // 2. Perform pgvector cosine similarity search with a relevance threshold of 0.35
    const rawResults: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT id, title, author, description, "coverUrl", "fileUrl", category, "createdAt", "updatedAt",
              (1 - (embedding <=> $1::vector)) as similarity
       FROM "books"
       WHERE embedding IS NOT NULL AND (1 - (embedding <=> $1::vector)) >= 0.35
       ORDER BY embedding <=> $1::vector ASC
       LIMIT 5`,
      vectorStr,
    );

    // 3. Resolve pre-signed URLs for covers
    return Promise.all(
      rawResults.map(async (book) => {
        let presignedCover: string | null = null;
        if (book.coverUrl) {
          try {
            presignedCover = await this.s3Service.getPresignedDownloadUrl(book.coverUrl, 3600);
          } catch (error: any) {
            console.error(`Failed to generate pre-signed URL for cover in semantic search: ${error.message}`);
          }
        }
        return {
          id: book.id,
          title: book.title,
          author: book.author,
          description: book.description,
          coverUrl: presignedCover || book.coverUrl,
          fileUrl: book.fileUrl,
          category: book.category,
          createdAt: book.createdAt,
          updatedAt: book.updatedAt,
          similarity: Number(book.similarity || 0),
        };
      }),
    );
  }

  /**
   * Generates personalized book recommendations for a user based on their
   * borrowing history, using the embedding of their most recently borrowed
   * book as the query vector (pgvector cosine similarity). Already-borrowed
   * books are excluded from the results.
   */
  async getRecommendations(userId: string) {
    // 1. Collect the user's borrowed book ids (most recent first)
    const slips = await this.prisma.borrowSlip.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { bookId: true },
    });
    const borrowedIds = [...new Set(slips.map((s) => s.bookId))];
    if (borrowedIds.length === 0) {
      return [];
    }

    // 2. Find the embedding of the most recently borrowed book that has one
    const seed: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT id, embedding::text AS embedding
       FROM "books"
       WHERE id = ANY($1::uuid[]) AND embedding IS NOT NULL
       ORDER BY array_position($1::uuid[], id) ASC
       LIMIT 1`,
      borrowedIds,
    );
    if (!seed.length || !seed[0].embedding) {
      return [];
    }
    const vectorStr = seed[0].embedding as string;

    // 3. Find similar books excluding the ones already borrowed
    const rawResults: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT id, title, author, description, "coverUrl", "fileUrl", category, tags, "keyConcepts", "createdAt", "updatedAt",
              (1 - (embedding <=> $1::vector)) as similarity
       FROM "books"
       WHERE embedding IS NOT NULL AND id <> ALL($2::uuid[])
       ORDER BY embedding <=> $1::vector ASC
       LIMIT 6`,
      vectorStr,
      borrowedIds,
    );

    // 4. Resolve pre-signed cover URLs
    return Promise.all(
      rawResults.map(async (book) => {
        let presignedCover: string | null = null;
        if (book.coverUrl) {
          try {
            presignedCover = await this.s3Service.getPresignedDownloadUrl(book.coverUrl, 3600);
          } catch (error: any) {
            console.error(`Failed to generate pre-signed URL for recommendation cover: ${error.message}`);
          }
        }
        return {
          id: book.id,
          title: book.title,
          author: book.author,
          description: book.description,
          coverUrl: presignedCover || book.coverUrl,
          category: book.category,
          tags: book.tags || [],
          keyConcepts: book.keyConcepts || [],
          similarity: Number(book.similarity || 0),
        };
      }),
    );
  }

  /**
   * Fetches the user's progress for a specific book.
   * Checks Redis first for real-time changes, falling back to PostgreSQL.
   */
  async getProgress(userId: string, bookId: string): Promise<{ currentPage: number }> {
    const progressKey = `progress:user:${userId}:book:${bookId}`;
    try {
      const redisClient = (this.documentQueue as any).client;
      if (redisClient) {
        const pageVal = await redisClient.get(progressKey);
        if (pageVal !== undefined && pageVal !== null) {
          return { currentPage: parseInt(pageVal, 10) };
        }
      }
    } catch (err: any) {
      console.error(`Failed to read progress from Redis: ${err.message}`);
    }

    // Fallback to PostgreSQL
    const progress = await this.prisma.readingProgress.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
    });

    return { currentPage: progress ? progress.currentPage : 1 };
  }

  /**
   * Returns the user's reading history (books they have progress on),
   * ordered by most recently read, with resolved cover URLs. Powers the
   * "Continue Reading" experience.
   */
  async getReadingHistory(userId: string) {
    const progresses = await this.prisma.readingProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    });

    if (progresses.length === 0) {
      return [];
    }

    const bookIds = progresses.map((p) => p.bookId);
    const books = await this.prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: {
        id: true,
        title: true,
        author: true,
        coverUrl: true,
        category: true,
      },
    });
    const bookMap = new Map(books.map((b) => [b.id, b]));

    const results: any[] = [];
    for (const progress of progresses) {
      const book = bookMap.get(progress.bookId);
      if (!book) continue;
      let presignedCover: string | null = null;
      if (book.coverUrl) {
        try {
          presignedCover = await this.s3Service.getPresignedDownloadUrl(book.coverUrl, 3600);
        } catch (error: any) {
          console.error(`Failed to generate pre-signed URL for reading history cover: ${error.message}`);
        }
      }
      results.push({
        ...book,
        coverUrl: presignedCover || book.coverUrl,
        currentPage: progress.currentPage,
        lastReadAt: progress.updatedAt,
      });
    }
    return results;
  }

  async addReview(bookId: string, userId: string, userEmail: string, rating: number, comment: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException(`Book with ID ${bookId} not found`);
    }
    return this.prisma.review.create({
      data: {
        bookId,
        userId,
        userEmail,
        rating,
        comment,
      },
    });
  }

  async getReviews(bookId: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException(`Book with ID ${bookId} not found`);
    }
    return this.prisma.review.findMany({
      where: { bookId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllReviews() {
    return this.prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}


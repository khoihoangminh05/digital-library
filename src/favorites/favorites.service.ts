import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  // List the user's favorite books with resolved cover URLs
  async findMy(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            description: true,
            coverUrl: true,
            category: true,
            tags: true,
          },
        },
      },
    });

    return Promise.all(
      favorites.map(async (fav) => {
        let presignedCover: string | null = null;
        if (fav.book.coverUrl) {
          try {
            presignedCover = await this.s3Service.getPresignedDownloadUrl(fav.book.coverUrl, 3600);
          } catch (error: any) {
            console.error(`Failed to generate pre-signed URL for favorite cover: ${error.message}`);
          }
        }
        return {
          favoritedAt: fav.createdAt,
          ...fav.book,
          coverUrl: presignedCover || fav.book.coverUrl,
        };
      }),
    );
  }

  // Return the set of book ids the user has favorited (for quick UI lookups)
  async findMyIds(userId: string): Promise<string[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { bookId: true },
    });
    return favorites.map((f) => f.bookId);
  }

  async add(userId: string, bookId: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException(`Book with ID ${bookId} not found`);
    }
    await this.prisma.favorite.upsert({
      where: { userId_bookId: { userId, bookId } },
      update: {},
      create: { userId, bookId },
    });
    return { favorited: true };
  }

  async remove(userId: string, bookId: string) {
    await this.prisma.favorite.deleteMany({
      where: { userId, bookId },
    });
    return { favorited: false };
  }
}

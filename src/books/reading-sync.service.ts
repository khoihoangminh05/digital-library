import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReadingSyncService {
  private readonly logger = new Logger(ReadingSyncService.name);

  constructor(
    @InjectQueue('document-processing')
    private readonly documentQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  // Run synchronization every 5 minutes
  @Cron('*/5 * * * *')
  async syncProgress() {
    this.logger.log('Starting reading progress synchronization from Redis to PostgreSQL...');
    await this.performSync();
  }

  // Method made public to allow manual triggering or testing
  async performSync() {
    const redisClient = (this.documentQueue as any).client;
    if (!redisClient) {
      this.logger.error('Redis client is not available in Bull queue for background sync.');
      return;
    }

    try {
      const dirtyMembers: string[] = await redisClient.smembers('dirty_progress_keys');
      if (!dirtyMembers || dirtyMembers.length === 0) {
        this.logger.log('No dirty reading progress records to synchronize.');
        return;
      }

      this.logger.log(`Found ${dirtyMembers.length} reading progress records to synchronize.`);

      for (const member of dirtyMembers) {
        const [userId, bookId] = member.split(':');
        if (!userId || !bookId) {
          this.logger.warn(`Invalid dirty progress member: ${member}`);
          await redisClient.srem('dirty_progress_keys', member);
          continue;
        }

        const progressKey = `progress:user:${userId}:book:${bookId}`;
        const pageVal = await redisClient.get(progressKey);
        
        if (pageVal === undefined || pageVal === null) {
          this.logger.warn(`No page progress found in Redis for key ${progressKey}`);
          await redisClient.srem('dirty_progress_keys', member);
          continue;
        }

        const currentPage = parseInt(pageVal, 10);
        if (isNaN(currentPage)) {
          this.logger.warn(`Invalid page progress value in Redis for key ${progressKey}: ${pageVal}`);
          await redisClient.srem('dirty_progress_keys', member);
          continue;
        }

        // Persist to PostgreSQL database via upsert
        try {
          await this.prisma.readingProgress.upsert({
            where: {
              userId_bookId: {
                userId,
                bookId,
              },
            },
            update: {
              currentPage,
            },
            create: {
              userId,
              bookId,
              currentPage,
            },
          });
          this.logger.log(`Synchronized progress for User ${userId}, Book ${bookId} to Page ${currentPage}`);
          
          // Remove from dirty keys set after successful persistence
          await redisClient.srem('dirty_progress_keys', member);
        } catch (dbErr: any) {
          this.logger.error(`Failed to sync progress for ${member} to DB: ${dbErr.message}`);
        }
      }
      this.logger.log('Reading progress synchronization completed.');
    } catch (err: any) {
      this.logger.error(`Error during reading progress sync: ${err.message}`);
    }
  }
}

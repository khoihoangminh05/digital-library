import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ReadingGateway {
  private readonly logger = new Logger(ReadingGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    @InjectQueue('document-processing')
    private readonly documentQueue: Queue,
  ) {}

  @SubscribeMessage('progress_update')
  async handleProgressUpdate(
    @MessageBody() data: { userId: string; bookId: string; currentPage: number },
  ) {
    const { userId, bookId, currentPage } = data;
    if (!userId || !bookId || currentPage === undefined || currentPage === null) {
      this.logger.warn(`Invalid progress_update payload: ${JSON.stringify(data)}`);
      return { status: 'error', message: 'Invalid payload' };
    }

    this.logger.log(`Progress update: User ${userId}, Book ${bookId}, Page ${currentPage}`);

    try {
      const redisClient = (this.documentQueue as any).client;
      if (!redisClient) {
        throw new Error('Redis client is not initialized in Bull queue');
      }

      // 1. Store the page in Redis key-value
      const progressKey = `progress:user:${userId}:book:${bookId}`;
      await redisClient.set(progressKey, currentPage.toString());

      // 2. Add composite key to dirty set for background DB sync
      const dirtyMember = `${userId}:${bookId}`;
      await redisClient.sadd('dirty_progress_keys', dirtyMember);

      return { status: 'success', page: currentPage };
    } catch (err: any) {
      this.logger.error(`Failed to store reading progress in Redis: ${err.message}`);
      return { status: 'error', message: err.message };
    }
  }
}

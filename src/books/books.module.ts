import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { S3Module } from '../s3/s3.module';
import { AiModule } from '../ai/ai.module';
import { BullModule } from '@nestjs/bull';
import { DocumentProcessingProcessor } from './processors/document-processing.processor';
import { ReadingGateway } from './reading.gateway';
import { ReadingSyncService } from './reading-sync.service';

@Module({
  imports: [
    S3Module,
    AiModule,
    BullModule.registerQueue({
      name: 'document-processing',
    }),
  ],
  controllers: [BooksController],
  providers: [BooksService, DocumentProcessingProcessor, ReadingGateway, ReadingSyncService],
  exports: [BooksService],
})
export class BooksModule {}


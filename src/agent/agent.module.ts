import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { BooksModule } from '../books/books.module';

@Module({
  imports: [BooksModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BorrowSlipsService } from './borrow-slips.service';
import { BorrowSlipsController } from './borrow-slips.controller';
import { PenaltyCronService } from './penalty-cron.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [BorrowSlipsController],
  providers: [BorrowSlipsService, PenaltyCronService],
  exports: [BorrowSlipsService, PenaltyCronService],
})
export class BorrowSlipsModule {}

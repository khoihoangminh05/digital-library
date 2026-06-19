import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BorrowStatus, PenaltyStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PenaltyCronService {
  private readonly logger = new Logger(PenaltyCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // Run daily at midnight to scan all active borrow slips
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scanOverdueSlips() {
    this.logger.log('Starting daily scan for overdue borrow slips...');
    await this.performScan();
    await this.remindDueSoon();
  }

  // Notify users whose borrowed books are due within the next 2 days
  async remindDueSoon() {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);

    const dueSoonSlips = await this.prisma.borrowSlip.findMany({
      where: {
        status: BorrowStatus.BORROWED,
        dueDate: { gte: now, lte: soon },
      },
      include: { book: { select: { title: true } } },
    });

    this.logger.log(`Found ${dueSoonSlips.length} borrow slips due within 2 days.`);

    for (const slip of dueSoonSlips) {
      if (!slip.dueDate) continue;
      await this.notifications.create(
        slip.userId,
        NotificationType.DUE_SOON,
        `Reminder: "${slip.book.title}" is due on ${slip.dueDate.toLocaleDateString('en-US')}. Please return it on time to avoid fines.`,
        '/my-borrows',
      );
    }
  }

  // Extracted core logic for manual triggering during testing / API calls
  async performScan() {
    const now = new Date();

    // 1. Fetch all slips currently BORROWED or OVERDUE that have passed their due date
    const overdueSlips = await this.prisma.borrowSlip.findMany({
      where: {
        status: {
          in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE],
        },
        dueDate: {
          lt: now,
        },
      },
      include: { book: { select: { title: true } } },
    });

    this.logger.log(`Found ${overdueSlips.length} potentially overdue or active late slips.`);

    for (const slip of overdueSlips) {
      if (!slip.dueDate) continue;

      try {
        // Calculate late days
        const diffTime = Math.abs(now.getTime() - slip.dueDate.getTime());
        const lateDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const fineAmount = lateDays * 1.00; // $1 per day

        // Transactionally update the borrow slip status and upsert the penalty slip
        await this.prisma.$transaction(async (tx) => {
          // Update borrow slip status to OVERDUE if it's currently BORROWED
          if (slip.status === BorrowStatus.BORROWED) {
            await tx.borrowSlip.update({
              where: { id: slip.id },
              data: { status: BorrowStatus.OVERDUE },
            });
          }

          // Create or update the penalty slip
          await tx.penaltySlip.upsert({
            where: { borrowSlipId: slip.id },
            update: {
              lateDays,
              fineAmount,
            },
            create: {
              borrowSlipId: slip.id,
              userId: slip.userId,
              lateDays,
              fineAmount,
              status: PenaltyStatus.UNPAID,
            },
          });
        });

        // Notify the user the first time a slip becomes overdue
        if (slip.status === BorrowStatus.BORROWED) {
          await this.notifications.create(
            slip.userId,
            NotificationType.OVERDUE,
            `"${slip.book.title}" is now overdue (${lateDays} day(s)). A fine of $${fineAmount.toFixed(2)} has been applied.`,
            '/my-borrows',
          );
        }

        this.logger.log(
          `Processed overdue slip ID: ${slip.id} for User ID: ${slip.userId}. Days Late: ${lateDays}, Fine: $${fineAmount.toFixed(2)}`
        );
      } catch (err: any) {
        this.logger.error(`Failed to process overdue slip ID: ${slip.id} - ${err.message}`);
      }
    }

    this.logger.log('Scan completed.');
  }
}

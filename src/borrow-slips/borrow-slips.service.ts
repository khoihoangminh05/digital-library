import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BorrowStatus, PenaltyStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BorrowSlipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // User requests to borrow a book
  async create(userId: string, bookId: string) {
    // 1. Verify book exists
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
    });
    if (!book) {
      throw new NotFoundException(`Book with ID ${bookId} not found`);
    }

    // 2. Block borrowing while the user has any unpaid penalty (violation handling)
    const unpaidPenalty = await this.prisma.penaltySlip.findFirst({
      where: {
        userId,
        status: PenaltyStatus.UNPAID,
      },
    });
    if (unpaidPenalty) {
      throw new BadRequestException(
        'You have an unpaid penalty. Please settle outstanding fines before borrowing new books.',
      );
    }

    // 3. Check if user already has an active borrow request or borrowing for the same book
    const existing = await this.prisma.borrowSlip.findFirst({
      where: {
        userId,
        bookId,
        status: {
          in: [BorrowStatus.PENDING, BorrowStatus.BORROWED, BorrowStatus.OVERDUE],
        },
      },
    });
    if (existing) {
      throw new BadRequestException('You already have a pending or active borrow slip for this book');
    }

    // 4. Create pending borrow slip
    return this.prisma.borrowSlip.create({
      data: {
        userId,
        bookId,
        status: BorrowStatus.PENDING,
      },
      include: {
        book: {
          select: {
            title: true,
            author: true,
          },
        },
      },
    });
  }

  // Get user's own slips
  async findMySlips(userId: string) {
    return this.prisma.borrowSlip.findMany({
      where: { userId },
      include: {
        book: {
          select: {
            title: true,
            author: true,
            coverUrl: true,
          },
        },
        penaltySlip: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Admin lists all slips
  async findAll() {
    return this.prisma.borrowSlip.findMany({
      include: {
        book: {
          select: {
            title: true,
            author: true,
          },
        },
        user: {
          select: {
            email: true,
          },
        },
        penaltySlip: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Admin approves request
  async approve(id: string) {
    const slip = await this.prisma.borrowSlip.findUnique({
      where: { id },
    });
    if (!slip) {
      throw new NotFoundException(`Borrow slip with ID ${id} not found`);
    }
    if (slip.status !== BorrowStatus.PENDING) {
      throw new BadRequestException(`Cannot approve borrow slip in ${slip.status} status`);
    }

    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 days borrow period

    const updated = await this.prisma.borrowSlip.update({
      where: { id },
      data: {
        status: BorrowStatus.BORROWED,
        borrowDate,
        dueDate,
      },
      include: {
        book: {
          select: { title: true },
        },
        user: {
          select: { email: true },
        },
      },
    });

    await this.notifications.create(
      updated.userId,
      NotificationType.BORROW_APPROVED,
      `Your borrow request for "${updated.book.title}" was approved. Due on ${dueDate.toLocaleDateString('en-US')}.`,
      '/my-borrows',
    );

    return updated;
  }

  // Admin rejects request
  async reject(id: string) {
    const slip = await this.prisma.borrowSlip.findUnique({
      where: { id },
    });
    if (!slip) {
      throw new NotFoundException(`Borrow slip with ID ${id} not found`);
    }
    if (slip.status !== BorrowStatus.PENDING) {
      throw new BadRequestException(`Cannot reject borrow slip in ${slip.status} status`);
    }

    const updated = await this.prisma.borrowSlip.update({
      where: { id },
      data: {
        status: BorrowStatus.REJECTED,
      },
      include: {
        book: { select: { title: true } },
      },
    });

    await this.notifications.create(
      updated.userId,
      NotificationType.BORROW_REJECTED,
      `Your borrow request for "${updated.book.title}" was rejected.`,
      '/my-borrows',
    );

    return updated;
  }

  // Admin marks book as returned
  async returnBook(id: string) {
    const slip = await this.prisma.borrowSlip.findUnique({
      where: { id },
    });
    if (!slip) {
      throw new NotFoundException(`Borrow slip with ID ${id} not found`);
    }
    if (slip.status !== BorrowStatus.BORROWED && slip.status !== BorrowStatus.OVERDUE) {
      throw new BadRequestException(`Cannot return a book with status ${slip.status}`);
    }

    const returnDate = new Date();
    
    // Check if the return is overdue and compute final penalty
    if (slip.dueDate && returnDate > slip.dueDate) {
      const diffTime = Math.abs(returnDate.getTime() - slip.dueDate.getTime());
      const lateDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const fineAmount = lateDays * 1.00; // $1 per day

      await this.prisma.penaltySlip.upsert({
        where: { borrowSlipId: id },
        update: {
          lateDays,
          fineAmount,
        },
        create: {
          borrowSlipId: id,
          userId: slip.userId,
          lateDays,
          fineAmount,
          status: PenaltyStatus.UNPAID,
        },
      });

      await this.notifications.create(
        slip.userId,
        NotificationType.PENALTY_ISSUED,
        `A late-return fine of $${fineAmount.toFixed(2)} (${lateDays} day(s) overdue) was issued. Please settle it to borrow again.`,
        '/my-borrows',
      );
    }

    return this.prisma.borrowSlip.update({
      where: { id },
      data: {
        status: BorrowStatus.RETURNED,
        returnDate,
      },
      include: {
        penaltySlip: true,
      },
    });
  }

  // Admin lists all penalty slips (violation handling)
  async findAllPenalties() {
    return this.prisma.penaltySlip.findMany({
      include: {
        user: {
          select: { email: true },
        },
        borrowSlip: {
          include: {
            book: {
              select: { title: true, author: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // User lists their own penalty slips
  async findMyPenalties(userId: string) {
    return this.prisma.penaltySlip.findMany({
      where: { userId },
      include: {
        borrowSlip: {
          include: {
            book: {
              select: { title: true, author: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Admin marks a penalty as paid
  async payPenalty(id: string) {
    const penalty = await this.prisma.penaltySlip.findUnique({
      where: { id },
    });
    if (!penalty) {
      throw new NotFoundException(`Penalty slip with ID ${id} not found`);
    }
    if (penalty.status === PenaltyStatus.PAID) {
      throw new BadRequestException('This penalty has already been paid');
    }

    return this.prisma.penaltySlip.update({
      where: { id },
      data: {
        status: PenaltyStatus.PAID,
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    });
  }
}

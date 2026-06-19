import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BorrowStatus, PenaltyStatus } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregates real-time platform metrics for the admin dashboard.
   */
  async getDashboardStats() {
    const [
      totalBooks,
      totalUsers,
      bannedUsers,
      totalReviews,
      activeBorrows,
      pendingRequests,
      overdueCount,
      returnedCount,
      unpaidAgg,
      paidAgg,
      topBooksRaw,
      categoryGroups,
      recentBorrows,
      borrowsByMonth,
    ] = await Promise.all([
      this.prisma.book.count(),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'BANNED' } }),
      this.prisma.review.count(),
      this.prisma.borrowSlip.count({
        where: { status: { in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE] } },
      }),
      this.prisma.borrowSlip.count({ where: { status: BorrowStatus.PENDING } }),
      this.prisma.borrowSlip.count({ where: { status: BorrowStatus.OVERDUE } }),
      this.prisma.borrowSlip.count({ where: { status: BorrowStatus.RETURNED } }),
      this.prisma.penaltySlip.aggregate({
        _sum: { fineAmount: true },
        _count: true,
        where: { status: PenaltyStatus.UNPAID },
      }),
      this.prisma.penaltySlip.aggregate({
        _sum: { fineAmount: true },
        where: { status: PenaltyStatus.PAID },
      }),
      this.prisma.borrowSlip.groupBy({
        by: ['bookId'],
        _count: { bookId: true },
        orderBy: { _count: { bookId: 'desc' } },
        take: 5,
      }),
      this.prisma.book.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
      this.prisma.borrowSlip.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          book: { select: { title: true } },
          user: { select: { email: true } },
        },
      }),
      this.getBorrowsByMonth(),
    ]);

    // Resolve titles for the top borrowed books
    const topBookIds = topBooksRaw.map((b) => b.bookId);
    const topBookRecords = await this.prisma.book.findMany({
      where: { id: { in: topBookIds } },
      select: { id: true, title: true, author: true },
    });
    const topBooks = topBooksRaw.map((b) => {
      const record = topBookRecords.find((r) => r.id === b.bookId);
      return {
        bookId: b.bookId,
        title: record?.title || 'Unknown',
        author: record?.author || '',
        borrowCount: b._count.bookId,
      };
    });

    const categoryDistribution = categoryGroups
      .map((c) => ({ category: c.category, count: c._count.category }))
      .sort((a, b) => b.count - a.count);

    return {
      overview: {
        totalBooks,
        totalUsers,
        bannedUsers,
        totalReviews,
        activeBorrows,
        pendingRequests,
        overdueCount,
        returnedCount,
      },
      penalties: {
        unpaidAmount: unpaidAgg._sum.fineAmount || 0,
        unpaidCount: unpaidAgg._count || 0,
        collectedAmount: paidAgg._sum.fineAmount || 0,
      },
      topBooks,
      categoryDistribution,
      recentBorrows: recentBorrows.map((s) => ({
        id: s.id,
        status: s.status,
        bookTitle: s.book?.title || 'Unknown',
        userEmail: s.user?.email || 'Unknown',
        createdAt: s.createdAt,
      })),
      borrowsByMonth,
    };
  }

  /**
   * Returns borrow counts grouped by month for the last 6 months.
   */
  private async getBorrowsByMonth(): Promise<{ month: string; count: number }[]> {
    try {
      const rows: { month: string; count: number }[] = await this.prisma.$queryRawUnsafe(
        `SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
                COUNT(*)::int AS count
         FROM "borrow_slips"
         WHERE "createdAt" >= (date_trunc('month', now()) - interval '5 months')
         GROUP BY 1
         ORDER BY 1 ASC`,
      );

      // Build a continuous 6-month series so empty months still render
      const series: { month: string; count: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const found = rows.find((r) => r.month === key);
        series.push({ month: key, count: found ? Number(found.count) : 0 });
      }
      return series;
    } catch {
      return [];
    }
  }
}

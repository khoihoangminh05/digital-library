import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BorrowSlipsService } from './borrow-slips.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BorrowStatus, PenaltyStatus } from '@prisma/client';

describe('BorrowSlipsService', () => {
  let service: BorrowSlipsService;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      book: { findUnique: jest.fn() },
      penaltySlip: { findFirst: jest.fn(), upsert: jest.fn() },
      borrowSlip: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    notifications = { create: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BorrowSlipsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<BorrowSlipsService>(BorrowSlipsService);
  });

  describe('create', () => {
    it('throws NotFound when the book does not exist', async () => {
      prisma.book.findUnique.mockResolvedValue(null);
      await expect(service.create('u1', 'b1')).rejects.toThrow(NotFoundException);
    });

    it('blocks borrowing while an unpaid penalty exists', async () => {
      prisma.book.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.penaltySlip.findFirst.mockResolvedValue({ id: 'p1', status: PenaltyStatus.UNPAID });
      await expect(service.create('u1', 'b1')).rejects.toThrow(BadRequestException);
    });

    it('blocks duplicate active borrow slips for the same book', async () => {
      prisma.book.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.penaltySlip.findFirst.mockResolvedValue(null);
      prisma.borrowSlip.findFirst.mockResolvedValue({ id: 's1', status: BorrowStatus.PENDING });
      await expect(service.create('u1', 'b1')).rejects.toThrow(BadRequestException);
    });

    it('creates a PENDING slip when all checks pass', async () => {
      prisma.book.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.penaltySlip.findFirst.mockResolvedValue(null);
      prisma.borrowSlip.findFirst.mockResolvedValue(null);
      prisma.borrowSlip.create.mockResolvedValue({ id: 's1', status: BorrowStatus.PENDING });

      const result = await service.create('u1', 'b1');
      expect(result.status).toBe(BorrowStatus.PENDING);
      expect(prisma.borrowSlip.create).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('throws when the slip is not pending', async () => {
      prisma.borrowSlip.findUnique.mockResolvedValue({ id: 's1', status: BorrowStatus.BORROWED });
      await expect(service.approve('s1')).rejects.toThrow(BadRequestException);
    });

    it('sets status to BORROWED and notifies the user', async () => {
      prisma.borrowSlip.findUnique.mockResolvedValue({ id: 's1', status: BorrowStatus.PENDING });
      prisma.borrowSlip.update.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        status: BorrowStatus.BORROWED,
        book: { title: 'Clean Code' },
      });

      const result = await service.approve('s1');
      expect(result.status).toBe(BorrowStatus.BORROWED);
      expect(notifications.create).toHaveBeenCalledWith(
        'u1',
        expect.anything(),
        expect.stringContaining('Clean Code'),
        '/my-borrows',
      );
    });
  });

  describe('returnBook', () => {
    it('creates a penalty and notifies when returned late', async () => {
      const dueDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      prisma.borrowSlip.findUnique.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        status: BorrowStatus.BORROWED,
        dueDate,
      });
      prisma.penaltySlip.upsert.mockResolvedValue({});
      prisma.borrowSlip.update.mockResolvedValue({ id: 's1', status: BorrowStatus.RETURNED });

      await service.returnBook('s1');
      expect(prisma.penaltySlip.upsert).toHaveBeenCalled();
      expect(notifications.create).toHaveBeenCalled();
    });

    it('does not create a penalty when returned on time', async () => {
      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days in the future
      prisma.borrowSlip.findUnique.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        status: BorrowStatus.BORROWED,
        dueDate,
      });
      prisma.borrowSlip.update.mockResolvedValue({ id: 's1', status: BorrowStatus.RETURNED });

      await service.returnBook('s1');
      expect(prisma.penaltySlip.upsert).not.toHaveBeenCalled();
    });
  });
});

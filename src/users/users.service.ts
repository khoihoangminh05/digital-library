import { Injectable, ConflictException, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, PenaltyStatus, BorrowStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;

  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, role } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    // Create user
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOneByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Check if user exists
    await this.findOne(id);

    const { email, password, role } = updateUserDto;

    // If updating email, check for conflicts
    if (email) {
      const emailConflict = await this.prisma.user.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });
      if (emailConflict) {
        throw new ConflictException(`Email ${email} is already in use by another user`);
      }
    }

    const updateData: any = { email, role };

    // If password is changed, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, this.saltRounds);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    // Check if user exists
    await this.findOne(id);

    return this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateRole(id: string, role: Role) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Returns the user's profile together with activity counters used by the
   * profile page (borrow stats, favorites, reading, outstanding fines).
   */
  async getProfileWithActivity(id: string) {
    const user = await this.findOne(id);

    const [totalBorrows, activeBorrows, favorites, reading, unpaidPenalties, totalFineAgg] =
      await Promise.all([
        this.prisma.borrowSlip.count({ where: { userId: id } }),
        this.prisma.borrowSlip.count({
          where: { userId: id, status: { in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE] } },
        }),
        this.prisma.favorite.count({ where: { userId: id } }),
        this.prisma.readingProgress.count({ where: { userId: id } }),
        this.prisma.penaltySlip.count({ where: { userId: id, status: PenaltyStatus.UNPAID } }),
        this.prisma.penaltySlip.aggregate({
          where: { userId: id, status: PenaltyStatus.UNPAID },
          _sum: { fineAmount: true },
        }),
      ]);

    return {
      ...user,
      activity: {
        totalBorrows,
        activeBorrows,
        favorites,
        reading,
        unpaidPenalties,
        outstandingFine: totalFineAgg._sum.fineAmount || 0,
      },
    };
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 4) {
      throw new BadRequestException('New password must be at least 4 characters long');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'Password updated successfully' };
  }
}

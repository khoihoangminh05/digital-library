import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  UseGuards, 
  Request, 
  ParseUUIDPipe 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BorrowSlipsService } from './borrow-slips.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('borrow-slips')
@Controller('borrow-slips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class BorrowSlipsController {
  constructor(private readonly borrowSlipsService: BorrowSlipsService) {}

  // User requests to borrow a book
  @Post()
  @ApiOperation({ summary: 'Request to borrow a book' })
  @ApiResponse({ status: 201, description: 'Borrow request successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createBorrowRequest(
    @Request() req: any,
    @Body('bookId', ParseUUIDPipe) bookId: string,
  ) {
    const userId = req.user.id;
    return this.borrowSlipsService.create(userId, bookId);
  }

  // User views their own borrow slips
  @Get('my')
  @ApiOperation({ summary: "Retrieve current user's borrow slips history" })
  @ApiResponse({ status: 200, description: 'History returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findMySlips(@Request() req: any) {
    const userId = req.user.id;
    return this.borrowSlipsService.findMySlips(userId);
  }

  // User views their own penalty slips
  @Get('my-penalties')
  @ApiOperation({ summary: "Retrieve current user's penalty slips" })
  @ApiResponse({ status: 200, description: 'Penalties returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findMyPenalties(@Request() req: any) {
    const userId = req.user.id;
    return this.borrowSlipsService.findMyPenalties(userId);
  }

  // Admin lists all penalty slips
  @Get('penalties')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all penalty slips (violation handling)' })
  @ApiResponse({ status: 200, description: 'All penalties returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findAllPenalties() {
    return this.borrowSlipsService.findAllPenalties();
  }

  // Admin marks a penalty as paid
  @Patch('penalties/:id/pay')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Mark a penalty slip as paid' })
  @ApiParam({ name: 'id', description: 'The UUID of the penalty slip' })
  @ApiResponse({ status: 200, description: 'Penalty marked as paid successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Penalty not found.' })
  async payPenalty(@Param('id', ParseUUIDPipe) id: string) {
    return this.borrowSlipsService.payPenalty(id);
  }

  // Admin lists all borrow slips
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all borrow slips in the system' })
  @ApiResponse({ status: 200, description: 'All slips returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findAll() {
    return this.borrowSlipsService.findAll();
  }

  // Admin approves request
  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve a borrow request' })
  @ApiParam({ name: 'id', description: 'The UUID of the borrow slip' })
  @ApiResponse({ status: 200, description: 'Borrow request approved successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Slip not found.' })
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.borrowSlipsService.approve(id);
  }

  // Admin rejects request
  @Patch(':id/reject')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reject a borrow request' })
  @ApiParam({ name: 'id', description: 'The UUID of the borrow slip' })
  @ApiResponse({ status: 200, description: 'Borrow request rejected successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Slip not found.' })
  async reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.borrowSlipsService.reject(id);
  }

  // Admin marks book as returned
  @Patch(':id/return')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Mark a borrowed book as returned' })
  @ApiParam({ name: 'id', description: 'The UUID of the borrow slip' })
  @ApiResponse({ status: 200, description: 'Book marked as returned successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Slip not found.' })
  async returnBook(@Param('id', ParseUUIDPipe) id: string) {
    return this.borrowSlipsService.returnBook(id);
  }
}

import { Controller, Get, Post, Delete, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('favorites')
@Controller('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: "Retrieve the current user's favorite books" })
  @ApiResponse({ status: 200, description: 'Favorites returned successfully.' })
  findMy(@Request() req: any) {
    return this.favoritesService.findMy(req.user.id);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Retrieve the ids of the current user favorite books' })
  @ApiResponse({ status: 200, description: 'Favorite book ids returned successfully.' })
  findMyIds(@Request() req: any) {
    return this.favoritesService.findMyIds(req.user.id);
  }

  @Post(':bookId')
  @ApiOperation({ summary: 'Add a book to favorites' })
  @ApiParam({ name: 'bookId', description: 'The UUID of the book' })
  @ApiResponse({ status: 201, description: 'Book added to favorites.' })
  @ApiResponse({ status: 404, description: 'Book not found.' })
  add(@Param('bookId', ParseUUIDPipe) bookId: string, @Request() req: any) {
    return this.favoritesService.add(req.user.id, bookId);
  }

  @Delete(':bookId')
  @ApiOperation({ summary: 'Remove a book from favorites' })
  @ApiParam({ name: 'bookId', description: 'The UUID of the book' })
  @ApiResponse({ status: 200, description: 'Book removed from favorites.' })
  remove(@Param('bookId', ParseUUIDPipe) bookId: string, @Request() req: any) {
    return this.favoritesService.remove(req.user.id, bookId);
  }
}

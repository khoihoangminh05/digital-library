import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, UseInterceptors, UploadedFiles, Query, Request, Res } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cover', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  @ApiOperation({ summary: 'Create a new book record with S3 file uploads' })
  @ApiResponse({ status: 201, description: 'Book successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(
    @Body() createBookDto: CreateBookDto,
    @UploadedFiles()
    files: {
      cover?: Express.Multer.File[];
      file?: Express.Multer.File[];
    },
  ) {
    const coverFile = files?.cover ? files.cover[0] : undefined;
    const bookFile = files?.file ? files.file[0] : undefined;
    return this.booksService.create(createBookDto, coverFile, bookFile);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  @ApiOperation({ summary: 'Retrieve books with optional search, category, sorting and pagination' })
  @ApiResponse({ status: 200, description: 'List of books retrieved successfully.' })
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('paginated') paginated?: string,
  ) {
    return this.booksService.findAll({
      search,
      category,
      sortBy,
      order,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      paginated: paginated === 'true',
    });
  }

  @Get('semantic-search')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Perform semantic cosine similarity search on books using embeddings' })
  @ApiResponse({ status: 200, description: 'List of top 5 matching books.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  semanticSearch(@Query('q') query: string) {
    if (!query) {
      return [];
    }
    return this.booksService.semanticSearch(query);
  }

  @Get('recommendations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get personalized book recommendations based on borrowing history' })
  @ApiResponse({ status: 200, description: 'List of recommended books.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getRecommendations(@Request() req: any) {
    return this.booksService.getRecommendations(req.user.id);
  }

  @Get('reading/history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get the user's reading history (continue reading)" })
  @ApiResponse({ status: 200, description: 'Reading history returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getReadingHistory(@Request() req: any) {
    return this.booksService.getReadingHistory(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single book by ID' })
  @ApiParam({ name: 'id', description: 'The UUID of the book' })
  @ApiResponse({ status: 200, description: 'Book found and returned.' })
  @ApiResponse({ status: 404, description: 'Book not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cover', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  @ApiOperation({ summary: 'Update an existing book record with optional new files' })
  @ApiParam({ name: 'id', description: 'The UUID of the book' })
  @ApiResponse({ status: 200, description: 'Book successfully updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Book not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBookDto: UpdateBookDto,
    @UploadedFiles()
    files?: {
      cover?: Express.Multer.File[];
      file?: Express.Multer.File[];
    },
  ) {
    const coverFile = files?.cover ? files.cover[0] : undefined;
    const bookFile = files?.file ? files.file[0] : undefined;
    return this.booksService.update(id, updateBookDto, coverFile, bookFile);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a book record and S3 objects' })
  @ApiParam({ name: 'id', description: 'The UUID of the book' })
  @ApiResponse({ status: 200, description: 'Book successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Book not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.remove(id);
  }

  @Get('file-url/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate a temporary pre-signed URL to read/download a secure S3 publication file' })
  @ApiParam({ name: 'id', description: 'The UUID of the book' })
  @ApiResponse({ status: 200, description: 'Pre-signed URL generated successfully.' })
  @ApiResponse({ status: 400, description: 'Book does not have an S3 file key.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Book not found.' })
  getFileUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.getFileUrl(id);
  }

  @Get('file-stream/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Stream a secure PDF book file bypassing CORS' })
  @ApiParam({ name: 'id', description: 'The UUID of the book' })
  async getFileStream(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: any,
  ) {
    const { buffer, fileName } = await this.booksService.getFileBuffer(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/progress')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get user's reading progress for a book" })
  @ApiParam({ name: 'id', description: 'The UUID of the book' })
  @ApiResponse({ status: 200, description: 'Progress returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Book not found.' })
  async getProgress(@Param('id', ParseUUIDPipe) bookId: string, @Request() req: any) {
    const userId = req.user.id;
    return this.booksService.getProgress(userId, bookId);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Retrieve all reviews across all books' })
  @ApiResponse({ status: 200, description: 'All reviews retrieved successfully.' })
  getAllReviews() {
    return this.booksService.getAllReviews();
  }

  @Post(':id/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit a review rating and comment for a book' })
  @ApiParam({ name: 'id', description: 'The UUID of the book' })
  @ApiResponse({ status: 201, description: 'Review successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Book not found.' })
  addReview(
    @Param('id', ParseUUIDPipe) bookId: string,
    @Body() createReviewDto: CreateReviewDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const userEmail = req.user.email;
    return this.booksService.addReview(bookId, userId, userEmail, createReviewDto.rating, createReviewDto.comment);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Retrieve reviews for a specific book' })
  @ApiParam({ name: 'id', description: 'The UUID of the book' })
  @ApiResponse({ status: 200, description: 'List of reviews retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Book not found.' })
  getReviews(@Param('id', ParseUUIDPipe) bookId: string) {
    return this.booksService.getReviews(bookId);
  }
}

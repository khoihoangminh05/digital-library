import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookDto {
  @ApiProperty({
    description: 'The title of the book',
    example: 'Introduction to Vector Search',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'The author of the book',
    example: 'Dr. Sarah Connor',
  })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({
    description: 'A brief description of the book content',
    example: 'Understanding similarity queries and metric indexing structures.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The S3 Key or public URL path to the cover image file',
    example: 'covers/vector-search.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiProperty({
    description: 'The AWS S3 Key of the publication document file',
    example: 'books/f239f82d-intro-vector.pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiProperty({
    description: 'The category or topic classification of the book',
    example: 'Artificial Intelligence',
  })
  @IsString()
  @IsNotEmpty()
  category: string;
}

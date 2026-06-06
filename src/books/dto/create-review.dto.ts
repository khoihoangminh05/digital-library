import { IsInt, IsString, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 5, description: 'Rating score from 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'This is a fantastic publication! Highly recommended.', description: 'Feedback review content' })
  @IsString()
  @IsNotEmpty()
  comment: string;
}

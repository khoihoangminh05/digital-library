import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'The current account password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'The new password (min 4 characters)' })
  @IsString()
  @MinLength(4)
  newPassword: string;
}

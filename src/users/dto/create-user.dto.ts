import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    description: 'The email address of the user',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'The password of the user (minimum 4 characters)',
    example: 'SecurePass123',
    minLength: 4,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(4, { message: 'Password must be at least 4 characters long' })
  password: string;

  @ApiProperty({
    description: 'The role of the user within the system',
    enum: Role,
    default: Role.USER,
    required: false,
  })
  @IsEnum(Role, { message: 'Role must be either ADMIN or USER' })
  @IsOptional()
  role?: Role;
}

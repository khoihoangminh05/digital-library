import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserEntity {
  @ApiProperty({
    description: 'The unique identifier of the user (UUID)',
    example: 'd8c36b8e-5b12-4cf3-a7a5-d8cf752c0022',
  })
  id: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'The role of the user within the system',
    enum: Role,
    example: Role.USER,
  })
  role: Role;

  @ApiProperty({
    description: 'The status of the user',
    example: 'ACTIVE',
  })
  status: string;

  @ApiProperty({
    description: 'The timestamp when the user was created',
    example: '2026-05-29T09:27:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The timestamp when the user was last updated',
    example: '2026-05-29T09:30:00.000Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}

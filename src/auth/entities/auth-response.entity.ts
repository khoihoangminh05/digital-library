import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../users/entities/user.entity';

export class AuthResponseEntity {
  @ApiProperty({
    description: 'The JWT access token used to authorize requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOGMzNmI4ZS01YjEyLTRjZjMtYTdhNS1kOGNmNzUyYzAwMjIiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiVVNFUiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDQzMjAwfQ...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'The details of the authenticated user',
    type: UserEntity,
  })
  user: UserEntity;
}

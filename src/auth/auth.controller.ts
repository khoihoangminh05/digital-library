import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserEntity } from '../users/entities/user.entity';
import { AuthResponseEntity } from './entities/auth-response.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registration successful.', type: UserEntity })
  @ApiResponse({ status: 400, description: 'Bad request (validation failed).' })
  @ApiResponse({ status: 409, description: 'Conflict (email already exists).' })
  async register(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    const user = await this.authService.register(createUserDto);
    return new UserEntity(user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and return JWT access token' })
  @ApiResponse({ status: 200, description: 'Login successful.', type: AuthResponseEntity })
  @ApiResponse({ status: 401, description: 'Unauthorized (invalid credentials).' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseEntity> {
    const response = await this.authService.login(loginDto);
    return {
      accessToken: response.accessToken,
      user: new UserEntity(response.user),
    };
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: any;
  let jwtService: any;

  beforeEach(async () => {
    usersService = { findOneByEmailWithPassword: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('validateUser', () => {
    it('throws when the user does not exist', async () => {
      usersService.findOneByEmailWithPassword.mockResolvedValue(null);
      await expect(
        service.validateUser({ email: 'x@y.com', password: '1234' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the account is banned', async () => {
      usersService.findOneByEmailWithPassword.mockResolvedValue({
        id: 'u1',
        email: 'x@y.com',
        password: 'hash',
        status: 'BANNED',
      });
      await expect(
        service.validateUser({ email: 'x@y.com', password: '1234' }),
      ).rejects.toThrow('Your account has been banned');
    });

    it('throws when the password is invalid', async () => {
      usersService.findOneByEmailWithPassword.mockResolvedValue({
        id: 'u1',
        email: 'x@y.com',
        password: 'hash',
        status: 'ACTIVE',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.validateUser({ email: 'x@y.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns the user without the password on success', async () => {
      usersService.findOneByEmailWithPassword.mockResolvedValue({
        id: 'u1',
        email: 'x@y.com',
        password: 'hash',
        status: 'ACTIVE',
        role: 'USER',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.validateUser({ email: 'x@y.com', password: '1234' });
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('x@y.com');
    });
  });

  describe('login', () => {
    it('returns an access token and user payload', async () => {
      usersService.findOneByEmailWithPassword.mockResolvedValue({
        id: 'u1',
        email: 'x@y.com',
        password: 'hash',
        status: 'ACTIVE',
        role: 'USER',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'x@y.com', password: '1234' });
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toEqual({ id: 'u1', email: 'x@y.com', role: 'USER' });
      expect(jwtService.sign).toHaveBeenCalled();
    });
  });
});

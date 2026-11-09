import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './auth.types.js';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const INVALID_REFRESH = 'Oturum yenilenemedi. Lütfen tekrar giriş yapın.';

@Injectable()
export class AuthService {
  private static readonly BCRYPT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}


  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, AuthService.BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash },
      select: publicUserSelect,
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Kullanıcı yoksa da şifre yanlışsa da AYNI mesaj: böylece saldırgan
    // hangi e-postaların sistemde kayıtlı olduğunu öğrenemez.
    const passwordOk = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !passwordOk) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Hesabınız pasif durumda. Yöneticinizle iletişime geçin.');
    }

    const { passwordHash: _passwordHash, updatedAt: _updatedAt, ...publicUser } = user;
    return this.issueTokens(publicUser);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
      include: { user: { select: publicUserSelect } },
    });

    if (!stored) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }

    if (stored.revokedAt) {
      // Daha önce kullanılmış/iptal edilmiş token tekrar geldi → olası hırsızlık
      await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedException(INVALID_REFRESH);
    }

    if (stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }

    return this.issueTokens(stored.user);
  }


  /** Refresh token'ı iptal eder. Token zaten geçersizse de sessizce başarılı olur. */
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }


  async me(userId: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Kullanıcı bulunamadı veya pasif');
    }
    return user;
  }



  private async issueTokens(user: UserResponseDto): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);

    // Refresh token: tahmin edilemez rastgele bir değer (JWT değil).
    // Veritabanına kendisi değil, SHA-256 hash'i yazılır.
    const refreshToken = randomBytes(48).toString('base64url');
    const days = Number(this.config.get('JWT_REFRESH_EXPIRES_DAYS', 7));
    const refreshTokenExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return {
      accessToken,
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      refreshToken,
      refreshTokenExpiresAt,
      user,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeAllForUser(userId: number): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
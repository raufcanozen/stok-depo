import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
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

export interface JwtPayload {
  sub: number; // kullanıcı id'si ("subject")
  email: string;
  role: UserResponseDto['role'];
}

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

    // E-posta zaten kayıtlıysa veritabanı unique hatası verir → filtre 409 döndürür.
    // Rol gönderilemez: yeni kullanıcılar şemadaki varsayılan rolü (VIEWER) alır.
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash },
      select: publicUserSelect,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    const passwordOk = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !passwordOk) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Hesabınız pasif durumda. Yöneticinizle iletişime geçin.');
    }

    const { passwordHash: _passwordHash, updatedAt: _updatedAt, ...publicUser } = user;
    return this.buildAuthResponse(publicUser);
  }

  private async buildAuthResponse(user: UserResponseDto): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      user,
    };
  }
}
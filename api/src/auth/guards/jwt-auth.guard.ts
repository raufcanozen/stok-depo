import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest, JwtPayload } from '../auth.types.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Global guard: @Public() ile işaretlenmemiş HER endpoint geçerli bir access token ister.
 * Token "Authorization: Bearer <token>" başlığında gelmelidir.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1) Endpoint (veya controller'ı) @Public() ise kontrol etme
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2) Token'ı başlıktan al
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Bu işlem için giriş yapmalısınız');
    }

    // 3) İmzayı ve süresini doğrula
    try {
      request.user = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Oturumunuzun süresi dolmuş veya token geçersiz');
    }
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
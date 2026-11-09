import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { Public } from './auth/decorators/public.decorator.js';
import { PrismaService } from './prisma/prisma.service.js';

@ApiTags('Sistem')
@Public()
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async health() {
    const [{ now }] = await this.prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;
    const userCount = await this.prisma.user.count();
    return { status: 'ok', database: 'connected', time: now, userCount };
  }
}
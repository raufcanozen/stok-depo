import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { JwtPayload } from '../auth/auth.types.js';
import { Role } from '../generated/prisma/enums.js';
import { StockChangeDto } from './dto/stock-change.dto.js';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto.js';
import { StockMovementsService } from './stock-movements.service.js';

/** Ürün bazlı stok işlemleri: /api/products/:id/stock/... */
@ApiTags('Stock Movements')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Giriş yapılmamış' })
@ApiForbiddenResponse({ description: 'Viewer stok değiştiremez' })
@ApiNotFoundResponse({ description: 'Ürün bulunamadı' })
@Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.STAFF)
@Controller('products/:id/stock')
export class ProductStockController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Post('increase')
  @ApiOperation({ summary: 'Stok artırma (giriş hareketi oluşturur)' })
  @ApiCreatedResponse({ type: StockMovementResponseDto })
  increase(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StockChangeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.increase(id, dto, user.sub);
  }

  @Post('decrease')
  @ApiOperation({ summary: 'Stok azaltma (çıkış hareketi oluşturur, stok eksiye düşemez)' })
  @ApiCreatedResponse({ type: StockMovementResponseDto })
  @ApiConflictResponse({ description: 'Yetersiz stok' })
  decrease(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StockChangeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.decrease(id, dto, user.sub);
  }
}
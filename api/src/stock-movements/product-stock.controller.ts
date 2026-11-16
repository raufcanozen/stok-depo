import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { JwtPayload } from '../auth/auth.types.js';
import { Role } from '../generated/prisma/enums.js';
import { ProductStockResponseDto } from './dto/product-stock-response.dto.js';
import { StockChangeDto } from './dto/stock-change.dto.js';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto.js';
import { StockMovementsService } from './stock-movements.service.js';

/** Ürün bazlı stok işlemleri: /api/products/:id/stock/... */
@ApiTags('Stock Movements')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Giriş yapılmamış' })
@ApiNotFoundResponse({ description: 'Ürün bulunamadı' })
@Controller('products/:id/stock')
export class ProductStockController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  @ApiOperation({ summary: 'Ürün stok bilgisi (giriş yapan herkes)' })
  @ApiOkResponse({ type: ProductStockResponseDto })
  getStock(@Param('id', ParseIntPipe) id: number): Promise<ProductStockResponseDto> {
    return this.stockMovementsService.getProductStock(id);
  }

  @Post('increase')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Stok artırma (giriş hareketi oluşturur)' })
  @ApiCreatedResponse({ type: StockMovementResponseDto })
  @ApiForbiddenResponse({ description: 'Viewer stok değiştiremez' })
  increase(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StockChangeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.increase(id, dto, user.sub);
  }

  @Post('decrease')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Stok azaltma (çıkış hareketi oluşturur, stok eksiye düşemez)' })
  @ApiCreatedResponse({ type: StockMovementResponseDto })
  @ApiForbiddenResponse({ description: 'Viewer stok değiştiremez' })
  @ApiConflictResponse({ description: 'Yetersiz stok' })
  decrease(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StockChangeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.decrease(id, dto, user.sub);
  }
}
import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator.js';
import type { Paginated } from '../common/dto/paginated-response.dto.js';
import { Role } from '../generated/prisma/enums.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { PurchaseOrderQueryDto } from './dto/purchase-order-query.dto.js';
import {
  PurchaseOrderDetailResponseDto,
  PurchaseOrderResponseDto,
} from './dto/purchase-order-response.dto.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Giriş yapılmamış' })
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Satın alma siparişi oluşturma (Admin, Warehouse Manager)' })
  @ApiCreatedResponse({ type: PurchaseOrderDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Geçersiz veri veya olmayan tedarikçi/ürün' })
  @ApiForbiddenResponse({ description: 'Yetki yok' })
  create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.purchaseOrdersService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Siparişleri listeleme (durum, tedarikçi, sipariş no / tedarikçi adı ile arama)' })
  @ApiPaginatedResponse(PurchaseOrderResponseDto)
  findAll(@Query() query: PurchaseOrderQueryDto): Promise<Paginated<PurchaseOrderResponseDto>> {
    return this.purchaseOrdersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Sipariş detayı (kalemleriyle)' })
  @ApiOkResponse({ type: PurchaseOrderDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Sipariş bulunamadı' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<PurchaseOrderDetailResponseDto> {
    return this.purchaseOrdersService.findOne(id);
  }
}
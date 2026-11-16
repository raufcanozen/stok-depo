import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator.js';
import type { Paginated } from '../common/dto/paginated-response.dto.js';
import { MovementType, Role } from '../generated/prisma/enums.js';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto.js';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto.js';
import { StockMovementsService } from './stock-movements.service.js';

@ApiTags('Stock Movements')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Giriş yapılmamış' })
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Stok hareketi oluşturma: IN, OUT veya ADJUSTMENT (sayım düzeltmesi yalnızca Admin/Manager)',
  })
  @ApiCreatedResponse({ type: StockMovementResponseDto })
  @ApiBadRequestResponse({ description: 'Geçersiz veri veya düzeltme gerekmiyor' })
  @ApiForbiddenResponse({ description: 'Yetki yok' })
  @ApiNotFoundResponse({ description: 'Ürün bulunamadı' })
  @ApiConflictResponse({ description: 'Yetersiz stok veya stok bu sırada değişti' })
  create(
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StockMovementResponseDto> {
    // Sayım düzeltmesi stoğu doğrudan değiştirdiği için daha yetkili rollere açık
    if (dto.type === MovementType.ADJUSTMENT && user.role === Role.STAFF) {
      throw new ForbiddenException('Sayım düzeltmesini yalnızca Admin veya Depo Müdürü yapabilir');
    }
    return this.stockMovementsService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Stok hareketlerini listeleme (ürün, tür, tarih aralığı, arama)' })
  @ApiPaginatedResponse(StockMovementResponseDto)
  findAll(@Query() query: StockMovementQueryDto): Promise<Paginated<StockMovementResponseDto>> {
    return this.stockMovementsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Stok hareketi detayı' })
  @ApiOkResponse({ type: StockMovementResponseDto })
  @ApiNotFoundResponse({ description: 'Stok hareketi bulunamadı' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.findOne(id);
  }
}
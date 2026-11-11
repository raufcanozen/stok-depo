import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator.js';
import type { Paginated } from '../common/dto/paginated-response.dto.js';
import { Role } from '../generated/prisma/enums.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import { WarehouseQueryDto } from './dto/warehouse-query.dto.js';
import { WarehouseResponseDto } from './dto/warehouse-response.dto.js';
import { WarehousesService } from './warehouses.service.js';

@ApiTags('Warehouses')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Giriş yapılmamış' })
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Depo oluşturma (Admin, Warehouse Manager)' })
  @ApiCreatedResponse({ type: WarehouseResponseDto })
  @ApiConflictResponse({ description: 'Bu isimde depo zaten var' })
  @ApiForbiddenResponse({ description: 'Yetki yok' })
  create(@Body() dto: CreateWarehouseDto): Promise<WarehouseResponseDto> {
    return this.warehousesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Depoları listeleme (sayfalı, aranabilir)' })
  @ApiPaginatedResponse(WarehouseResponseDto)
  findAll(@Query() query: WarehouseQueryDto): Promise<Paginated<WarehouseResponseDto>> {
    return this.warehousesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Depo detayı' })
  @ApiOkResponse({ type: WarehouseResponseDto })
  @ApiNotFoundResponse({ description: 'Depo bulunamadı' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<WarehouseResponseDto> {
    return this.warehousesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Depo güncelleme (Admin, Warehouse Manager)' })
  @ApiOkResponse({ type: WarehouseResponseDto })
  @ApiNotFoundResponse({ description: 'Depo bulunamadı' })
  @ApiConflictResponse({ description: 'Bu isimde depo zaten var' })
  @ApiForbiddenResponse({ description: 'Yetki yok' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.warehousesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Depo silme (yalnızca Admin, içinde ürün yoksa)' })
  @ApiNoContentResponse({ description: 'Silindi' })
  @ApiNotFoundResponse({ description: 'Depo bulunamadı' })
  @ApiConflictResponse({ description: 'Depoda ürün var' })
  @ApiForbiddenResponse({ description: 'Yalnızca Admin silebilir' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.warehousesService.remove(id);
  }
}

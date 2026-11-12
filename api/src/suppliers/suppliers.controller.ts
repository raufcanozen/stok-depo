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
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { SupplierQueryDto } from './dto/supplier-query.dto.js';
import { SupplierResponseDto } from './dto/supplier-response.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';
import { SuppliersService } from './suppliers.service.js';

@ApiTags('Suppliers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Giriş yapılmamış' })
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Tedarikçi oluşturma (Admin, Warehouse Manager)' })
  @ApiCreatedResponse({ type: SupplierResponseDto })
  @ApiConflictResponse({ description: 'Bu vergi numarası başka bir tedarikçide kayıtlı' })
  @ApiForbiddenResponse({ description: 'Yetki yok' })
  create(@Body() dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    return this.suppliersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Tedarikçileri listeleme (sayfalı; ad, e-posta, vergi no ile aranabilir)' })
  @ApiPaginatedResponse(SupplierResponseDto)
  findAll(@Query() query: SupplierQueryDto): Promise<Paginated<SupplierResponseDto>> {
    return this.suppliersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Tedarikçi detayı' })
  @ApiOkResponse({ type: SupplierResponseDto })
  @ApiNotFoundResponse({ description: 'Tedarikçi bulunamadı' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SupplierResponseDto> {
    return this.suppliersService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Tedarikçi güncelleme (Admin, Warehouse Manager)' })
  @ApiOkResponse({ type: SupplierResponseDto })
  @ApiNotFoundResponse({ description: 'Tedarikçi bulunamadı' })
  @ApiConflictResponse({ description: 'Bu vergi numarası başka bir tedarikçide kayıtlı' })
  @ApiForbiddenResponse({ description: 'Yetki yok' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Tedarikçi silme (yalnızca Admin, siparişi yoksa)' })
  @ApiNoContentResponse({ description: 'Silindi' })
  @ApiNotFoundResponse({ description: 'Tedarikçi bulunamadı' })
  @ApiConflictResponse({ description: 'Tedarikçinin siparişi var' })
  @ApiForbiddenResponse({ description: 'Yalnızca Admin silebilir' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.suppliersService.remove(id);
  }
}

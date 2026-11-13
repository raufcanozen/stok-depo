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
  ApiBadRequestResponse,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { JwtPayload } from '../auth/auth.types.js';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator.js';
import type { Paginated } from '../common/dto/paginated-response.dto.js';
import { Role } from '../generated/prisma/enums.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ProductQueryDto } from './dto/product-query.dto.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsService } from './products.service.js';

@ApiTags('Products')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Giriş yapılmamış' })
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Ürün oluşturma (Admin, Warehouse Manager)' })
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse({ description: 'Geçersiz veri veya olmayan kategori/depo' })
  @ApiConflictResponse({ description: 'Bu SKU başka bir üründe kullanılıyor' })
  @ApiForbiddenResponse({ description: 'Yetki yok' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProductResponseDto> {
    return this.productsService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Ürünleri listeleme (sayfalı; ad veya SKU ile aranabilir)' })
  @ApiPaginatedResponse(ProductResponseDto)
  findAll(@Query() query: ProductQueryDto): Promise<Paginated<ProductResponseDto>> {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ürün detayı' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Ürün bulunamadı' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ProductResponseDto> {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Ürün güncelleme (Admin, Warehouse Manager). Stok buradan değişmez.' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse({ description: 'Geçersiz veri veya olmayan kategori/depo' })
  @ApiNotFoundResponse({ description: 'Ürün bulunamadı' })
  @ApiConflictResponse({ description: 'Bu SKU başka bir üründe kullanılıyor' })
  @ApiForbiddenResponse({ description: 'Yetki yok' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ürün silme (yalnızca Admin)' })
  @ApiNoContentResponse({ description: 'Silindi' })
  @ApiNotFoundResponse({ description: 'Ürün bulunamadı' })
  @ApiConflictResponse({ description: 'Ürünün stok hareketi veya siparişi var' })
  @ApiForbiddenResponse({ description: 'Yalnızca Admin silebilir' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.productsService.remove(id);
  }
}

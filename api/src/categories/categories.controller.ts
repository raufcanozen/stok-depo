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
import { CategoriesService } from './categories.service.js';
import { CategoryQueryDto } from './dto/category-query.dto.js';
import { CategoryResponseDto } from './dto/category-response.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@ApiTags('Categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Giriş yapılmamış' })
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Kategori oluşturma (Admin, Warehouse Manager)' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  @ApiConflictResponse({ description: 'Bu isimde kategori zaten var' })
  @ApiForbiddenResponse({ description: 'Yetki yok' })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Kategorileri listeleme (sayfalı, aranabilir)' })
  @ApiPaginatedResponse(CategoryResponseDto)
  findAll(@Query() query: CategoryQueryDto): Promise<Paginated<CategoryResponseDto>> {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Kategori detayı' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Kategori bulunamadı' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Kategori güncelleme (Admin, Warehouse Manager)' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Kategori bulunamadı' })
  @ApiConflictResponse({ description: 'Bu isimde kategori zaten var' })
  @ApiForbiddenResponse({ description: 'Yetki yok' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Kategori silme (yalnızca Admin, içinde ürün yoksa)' })
  @ApiNoContentResponse({ description: 'Silindi' })
  @ApiNotFoundResponse({ description: 'Kategori bulunamadı' })
  @ApiConflictResponse({ description: 'Kategoride ürün var' })
  @ApiForbiddenResponse({ description: 'Yalnızca Admin silebilir' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
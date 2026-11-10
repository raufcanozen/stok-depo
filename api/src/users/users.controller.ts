import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
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
import type { JwtPayload } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserResponseDto } from '../auth/dto/auth-response.dto.js';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator.js';
import type { Paginated } from '../common/dto/paginated-response.dto.js';
import { Role } from '../generated/prisma/enums.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserQueryDto } from './dto/user-query.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Giriş yapılmamış' })
@ApiForbiddenResponse({ description: 'Yalnızca ADMIN erişebilir' })
@Roles(Role.ADMIN) // Bu controller'daki TÜM endpoint'ler yalnızca Admin'e açık
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Kullanıcıları listeleme (sayfalı, aranabilir, filtrelenebilir)' })
  @ApiPaginatedResponse(UserResponseDto)
  findAll(@Query() query: UserQueryDto): Promise<Paginated<UserResponseDto>> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Kullanıcı detayı' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Kullanıcı bulunamadı' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Kullanıcı oluşturma (rol belirtilerek)' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'Bu e-posta zaten kayıtlı' })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Kullanıcı güncelleme: ad, rol veya aktiflik durumu' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Geçersiz veri veya admin kendi hesabını kısıtlamaya çalışıyor' })
  @ApiNotFoundResponse({ description: 'Kullanıcı bulunamadı' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto, currentUser.sub);
  }
}
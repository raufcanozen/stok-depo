import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { publicUserSelect } from '../auth/auth.service.js';
import { UserResponseDto } from '../auth/dto/auth-response.dto.js';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<UserResponseDto[]> {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicUserSelect });
    if (!user) {
      throw new NotFoundException(`${id} numaralı kullanıcı bulunamadı`);
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { name: dto.name, email: dto.email, role: dto.role, passwordHash },
      select: publicUserSelect,
    });
  }

  /**
   * @param currentUserId İşlemi yapan admin'in id'si (kendini kilitlememesi için)
   */
  async update(id: number, dto: UpdateUserDto, currentUserId: number): Promise<UserResponseDto> {
    const existing = await this.findOne(id); // yoksa 404

    // Admin kendi hesabını pasifleştiremez veya kendi admin yetkisini kaldıramaz.
    // Aksi halde sistemde hiç admin kalmayabilir.
    if (id === currentUserId) {
      if (dto.isActive === false) {
        throw new BadRequestException('Kendi hesabınızı pasifleştiremezsiniz');
      }
      if (dto.role && dto.role !== Role.ADMIN) {
        throw new BadRequestException('Kendi admin yetkinizi kaldıramazsınız');
      }
    }

    const roleChanged = dto.role !== undefined && dto.role !== existing.role;
    const deactivated = dto.isActive === false && existing.isActive;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: dto,
        select: publicUserSelect,
      });

      // Rol değiştiyse veya kullanıcı pasifleştirildiyse açık oturumlarını kapat:
      // eski rolü taşıyan token'larla yeni access token alamasın.
      if (roleChanged || deactivated) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return user;
    });
  }
}

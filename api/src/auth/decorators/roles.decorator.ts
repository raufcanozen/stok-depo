import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/enums.js';

export const ROLES_KEY = 'roles';

/**
 * Endpoint'i yalnızca belirtilen rollere açar.
 * @Roles() olmayan endpoint'lere giriş yapmış HER kullanıcı erişebilir.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
/** Backend'deki Role enum'ı ile aynı */
export type Role = 'ADMIN' | 'WAREHOUSE_MANAGER' | 'STAFF' | 'VIEWER';

/** Arayüzde gösterilecek rol adları */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Yönetici',
  WAREHOUSE_MANAGER: 'Depo Müdürü',
  STAFF: 'Personel',
  VIEWER: 'İzleyici',
};

/** GET /api/auth/me yanıtı */
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

/** POST /api/auth/login ve /api/auth/refresh-token yanıtı */
export interface AuthResponse {
  accessToken: string;
  expiresIn: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: User;
}
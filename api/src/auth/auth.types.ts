import type { Request } from 'express';
import type { Role } from '../generated/prisma/enums.js';

/** Access token'ın içine yazılan bilgiler */
export interface JwtPayload {
  sub: number; 
  email: string;
  role: Role;
}


export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
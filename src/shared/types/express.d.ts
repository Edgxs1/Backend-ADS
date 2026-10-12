import type { Rol } from './roles.js';

export interface AuthUser {
  id: string;
  email: string | null;
  rol: Rol | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};

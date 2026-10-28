import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        id_usuario?: string;
        email: string;
        rol: string;
        rfc?: string;
        activo?: boolean;
        [key: string]: any;
      };
    }
  }
}

export {};
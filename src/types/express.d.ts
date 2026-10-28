import type { Request } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      id_usuario?: string;
      email: string;
      rol?: string;
      rfc?: string;
      activo?: boolean;
      [key: string]: any;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        id_usuario?: string;
        email: string;
        rol?: string;
        rfc?: string;
        activo?: boolean;
        [key: string]: any;
      };
    }
  }
}

export {};

import 'express';
import 'express-serve-static-core';

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

export {};

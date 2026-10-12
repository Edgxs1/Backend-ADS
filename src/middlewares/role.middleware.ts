import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../shared/errors/AppError.js';
import type { Rol } from '../shared/types/roles.js';

export function roleMiddleware(...allowedRoles: Rol[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const user = req.user;

      if (!user) {
        throw new AppError(401, 'No autorizado: usuario no autenticado');
      }

      if (!user.rol || !allowedRoles.includes(user.rol)) {
        throw new AppError(403, 'Acceso denegado: no tienes permisos para esta acción');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

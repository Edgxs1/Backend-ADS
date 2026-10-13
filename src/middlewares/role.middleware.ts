import type { NextFunction, Request, RequestHandler } from 'express';
import { findAsignacionActiva } from '../modules/asignaciones/asignaciones.repository.js';
import { AppError } from '../shared/errors/AppError.js';
import type { Rol } from '../shared/types/roles.js';

function extraerIdObra(req: Request): string | undefined {
  const candidato = req.params['id_obra'] ?? req.body?.['id_obra'] ?? req.query['id_obra'];
  return typeof candidato === 'string' && candidato.length > 0 ? candidato : undefined;
}

export function roleMiddleware(...allowedRoles: Rol[]): RequestHandler {
  return async (req: Request, _res, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        throw new AppError(401, 'No autorizado: usuario no autenticado');
      }

      if (!req.accessToken) {
        throw new AppError(401, 'No autorizado: token ausente');
      }

      const idObra = extraerIdObra(req);

      if (!idObra) {
        throw new AppError(400, 'Falta el id_obra en la petición');
      }

      const asignacion = await findAsignacionActiva(user.id, idObra, req.accessToken);

      if (!asignacion || !allowedRoles.includes(asignacion.rol)) {
        throw new AppError(403, 'Acceso denegado: no tienes el rol requerido en esta obra');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

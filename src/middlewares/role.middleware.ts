import type { NextFunction, Request, RequestHandler } from 'express';
import { findAsignacionActiva } from '../repositories/asignaciones.repository.js';
import { findUsuarioPorId } from '../repositories/usuarios.repository.js';
import { AppError } from '../shared/errors/AppError.js';
import { ROL_BY_ID } from '../shared/types/roles.js';
import type { Rol } from '../shared/types/roles.js';

export interface RoleOptions {
  scope?: 'obra' | 'global';
}

function extraerIdObra(req: Request): string | undefined {
  const candidato = req.params['id_obra'] ?? req.body?.['id_obra'] ?? req.query['id_obra'];
  return typeof candidato === 'string' && candidato.length > 0 ? candidato : undefined;
}

export function roleMiddleware(...args: Array<Rol | RoleOptions>): RequestHandler {
  const allowedRoles: Rol[] = [];
  let scope: 'obra' | 'global' = 'obra';

  for (const arg of args) {
    if (typeof arg === 'string') {
      allowedRoles.push(arg);
    } else if (arg.scope) {
      scope = arg.scope;
    }
  }

  return async (req: Request, _res, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        throw new AppError(401, 'No autorizado: usuario no autenticado');
      }

      if (!req.accessToken) {
        throw new AppError(401, 'No autorizado: token ausente');
      }

      const usuario = await findUsuarioPorId(user.id, req.accessToken);
      const rol = usuario ? ROL_BY_ID[usuario.id_rol] : undefined;

      if (!rol || !allowedRoles.includes(rol)) {
        throw new AppError(403, 'Acceso denegado: no tienes el rol requerido');
      }

      if (scope === 'global') {
        next();
        return;
      }

      const idObra = extraerIdObra(req);

      if (!idObra) {
        next();
        return;
      }

      const asignacion = await findAsignacionActiva(user.id, idObra, req.accessToken);

      if (!asignacion) {
        throw new AppError(403, 'Acceso denegado: no estás asignado a esta obra');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

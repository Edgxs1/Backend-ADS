import type { NextFunction, Request, Response } from 'express';
import { obtenerPendientesPorRol } from '../services/pendientes.service.js';
import { AppError } from '../shared/errors/AppError.js';
import { ROL_BY_ID, ROLES, type Rol } from '../shared/types/roles.js';

function resolverRol(req: Request): Rol | null {
  const user = req.user;

  if (!user) {
    throw new AppError(401, 'No autorizado: usuario no autenticado');
  }

  if (typeof user.rol === 'string' && ROLES.includes(user.rol as Rol)) {
    return user.rol as Rol;
  }

  if (user.id_rol != null) {
    return ROL_BY_ID[Number(user.id_rol)] ?? null;
  }

  return null;
}

export async function listar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const usuario = req.user;

    if (!usuario) {
      throw new AppError(401, 'No autorizado: usuario no autenticado');
    }

    const tareas = await obtenerPendientesPorRol(usuario.id, resolverRol(req));

    res.status(200).json({ success: true, data: tareas });
  } catch (error) {
    next(error);
  }
}

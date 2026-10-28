import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { findUsuarioPorId } from '../repositories/usuarios.repository.js';
import { AppError } from '../shared/errors/AppError.js';

const BEARER_PREFIX = 'Bearer ';

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith(BEARER_PREFIX)) {
      throw new AppError(401, 'No autorizado: falta el token Bearer');
    }

    const token = authHeader.slice(BEARER_PREFIX.length).trim();

    if (!token) {
      throw new AppError(401, 'No autorizado: token vacío');
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      throw new AppError(401, 'No autorizado: token inválido o expirado');
    }

    const usuario = await findUsuarioPorId(data.user.id);

    const esConsultaPerfilPropio = req.originalUrl.startsWith('/api/v1/usuarios/me');

    if (usuario && usuario.activo === false && !esConsultaPerfilPropio) {
      throw new AppError(
        403,
        'Cuenta desactivada temporalmente. Contacte al administrador',
        { code: 'CUENTA_DESACTIVADA' },
      );
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? '',
      rol: usuario ? undefined : undefined,
    } as any;

    next();
  } catch (error) {
    next(error);
  }
}

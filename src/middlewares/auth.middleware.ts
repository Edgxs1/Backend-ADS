import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';
import { ROL_BY_ID } from '../shared/types/roles.js';

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

    const authUserId = data.user.id;
    const authEmail = data.user.email ?? '';

    let usuario: any = null;

    const { data: usuarioByIdUsuario } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id_usuario', authUserId)
      .maybeSingle();
    if (usuarioByIdUsuario) usuario = usuarioByIdUsuario;

    if (!usuario && authEmail) {
      const { data: usuarioByEmail } = await supabaseAdmin
        .from('usuarios')
        .select('*')
        .eq('correo', authEmail)
        .maybeSingle();
      if (usuarioByEmail) usuario = usuarioByEmail;
    }

    const esConsultaPerfilPropio = req.originalUrl.startsWith('/api/v1/usuarios/me');

    if (usuario && usuario.activo === false && !esConsultaPerfilPropio) {
      throw new AppError(
        403,
        'Cuenta desactivada temporalmente. Contacte al administrador',
        { code: 'CUENTA_DESACTIVADA' },
      );
    }

    if (usuario) {
      req.user = {
        ...usuario,
        id: usuario.id_usuario || authUserId,
        id_usuario: usuario.id_usuario || authUserId,
        correo: usuario.correo || authEmail || '',
        email: authEmail ?? usuario.correo ?? '',
        rol:
          usuario.rol ??
          (usuario.id_rol != null
            ? ROL_BY_ID[Number(usuario.id_rol)] ?? null
            : null),
      } as any;
    } else {
      req.user = {
        id: authUserId,
        id_usuario: authUserId,
        email: authEmail,
        correo: authEmail,
        id_rol: null,
        rol: null,
        activo: true,
      } as any;
    }

    next();
  } catch (error) {
    next(error);
  }
}

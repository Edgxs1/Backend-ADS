import type { NextFunction, Request, Response } from 'express';
import {
  actualizarPerfil,
  cambiarContrasena,
} from '../services/usuarios.service.js';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';
import { ROL_BY_ID } from '../shared/types/roles.js';

function normalizarPerfil(usuario: Record<string, any>): Record<string, any> {
  const idRol = usuario.id_rol ?? null;

  return {
    ...usuario,
    id_rol: idRol,
    rol:
      usuario.rol ??
      (idRol != null ? ROL_BY_ID[Number(idRol)] ?? null : null),
  };
}

export const obtenerMiPerfil = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id || (req.user as any)?.id_usuario;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    let usuario: any = null;

    const { data: usuarioByIdUsuario } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id_usuario', userId)
      .maybeSingle();
    if (usuarioByIdUsuario) usuario = usuarioByIdUsuario;

    if (!usuario && (req.user as any)?.correo) {
      const { data: usuarioByEmail } = await supabaseAdmin
        .from('usuarios')
        .select('*')
        .eq('correo', (req.user as any).correo)
        .maybeSingle();
      if (usuarioByEmail) usuario = usuarioByEmail;
    }

    if (usuario) {
      return res.status(200).json({ success: true, data: normalizarPerfil(usuario) });
    }

    const fallback = req.user || {};
    return res.status(200).json({
      success: true,
      data: normalizarPerfil({
        ...fallback,
        id_usuario: (fallback as any).id_usuario || userId,
        id: (fallback as any).id || userId,
        correo: (fallback as any).correo || (fallback as any).email || '',
        email: (fallback as any).email || (fallback as any).correo || '',
        id_rol: (fallback as any).id_rol ?? null,
        rol: (fallback as any).rol ?? null,
        activo: (fallback as any).activo ?? true,
      }),
    });
  } catch (error: any) {
    console.error('🚨 CRASH EN /usuarios/me:', error);
    const fallback = (req.user as any) || {};
    const userId = fallback.id || fallback.id_usuario;
    return res.status(200).json({
      success: true,
      data: normalizarPerfil({
        ...fallback,
        id_usuario: fallback.id_usuario || userId,
        id: fallback.id || userId,
        correo: fallback.correo || fallback.email || '',
        email: fallback.email || fallback.correo || '',
        id_rol: fallback.id_rol ?? null,
        rol: fallback.rol ?? null,
        activo: fallback.activo ?? true,
      }),
    });
  }
};

export const me = obtenerMiPerfil;

export async function actualizarPerfilPropio(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;

    if (!user) {
      throw new AppError(401, 'No autorizado: usuario no autenticado');
    }

    const perfil = await actualizarPerfil(user.id, req.body);
    res.status(200).json({ success: true, data: perfil });
  } catch (error) {
    next(error);
  }
}

export async function cambiarPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;

    if (!user) {
      throw new AppError(401, 'No autorizado: usuario no autenticado');
    }

    const { nueva_contrasena } = req.body as { nueva_contrasena: string };
    await cambiarContrasena(user.id, nueva_contrasena);

    res.status(200).json({ success: true, data: { ok: true } });
  } catch (error) {
    next(error);
  }
}

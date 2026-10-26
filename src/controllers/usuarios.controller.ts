import type { NextFunction, Request, Response } from 'express';
import {
  actualizarPerfil,
  cambiarContrasena,
  obtenerPerfil,
} from '../services/usuarios.service.js';
import { AppError } from '../shared/errors/AppError.js';

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;

    if (!user) {
      throw new AppError(401, 'No autorizado: usuario no autenticado');
    }

    const perfil = await obtenerPerfil(user.id);

    res.status(200).json({ success: true, data: perfil });
  } catch (error) {
    next(error);
  }
}

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

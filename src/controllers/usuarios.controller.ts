import type { NextFunction, Request, Response } from 'express';
import { obtenerPerfil } from '../services/usuarios.service.js';
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

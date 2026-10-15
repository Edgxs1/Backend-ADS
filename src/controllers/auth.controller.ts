import type { NextFunction, Request, Response } from 'express';
import type {
  LoginDto,
  RecuperarDto,
  RestablecerDto,
} from '../schemas/auth.schemas.js';
import {
  iniciarSesion,
  restablecerPassword,
  solicitarRestablecimiento,
} from '../services/auth.service.js';
import { AppError } from '../shared/errors/AppError.js';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as LoginDto;
    const sesion = await iniciarSesion(email, password);

    res.status(200).json({ success: true, data: sesion });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as RecuperarDto;
    await solicitarRestablecimiento(email);

    res.status(200).json({
      success: true,
      data: { message: 'Si el correo está registrado, recibirás un enlace.' },
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'No autorizado: usuario no autenticado');
    }

    const { password } = req.body as RestablecerDto;
    await restablecerPassword(req.user.id, password);

    res.status(200).json({
      success: true,
      data: { message: 'Contraseña actualizada' },
    });
  } catch (error) {
    next(error);
  }
}

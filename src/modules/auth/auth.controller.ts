import type { NextFunction, Request, Response } from 'express';
import type { LoginDto } from './auth.schemas.js';
import { enviarMagicLink } from './auth.service.js';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as LoginDto;

    await enviarMagicLink(email);

    res.status(200).json({
      success: true,
      message: 'Si el correo está registrado, recibirás un enlace de acceso.',
    });
  } catch (error) {
    next(error);
  }
}

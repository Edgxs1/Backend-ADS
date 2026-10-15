import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
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

    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
    };
    req.accessToken = token;

    next();
  } catch (error) {
    next(error);
  }
}

import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../shared/errors/AppError.js';

const RUTAS_EXENTAS = new Set(['/api/v1/health', '/health']);

export const verifyInternalSecret: RequestHandler = (req, _res, next) => {
  const secreto = env.INTERNAL_API_SECRET;

  if (!secreto || RUTAS_EXENTAS.has(req.path) || RUTAS_EXENTAS.has(req.originalUrl)) {
    next();
    return;
  }

  if (req.header('x-internal-secret') !== secreto) {
    next(new AppError(403, 'Acceso denegado: x-internal-secret inválido'));
    return;
  }

  next();
};

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/AppError.js';

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      statusCode: 404,
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    },
  });
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const details = err.details !== undefined ? err.details : undefined;
    res.status(err.statusCode).json({
      success: false,
      error: {
        statusCode: err.statusCode,
        message: err.message,
        ...(details !== undefined ? { details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        statusCode: 400,
        message: 'Datos de entrada inválidos',
        details: err.issues,
      },
    });
    return;
  }

  console.error('[error middleware]', err);
  res.status(500).json({
    success: false,
    error: {
      statusCode: 500,
      message: 'Error interno del servidor',
    },
  });
}

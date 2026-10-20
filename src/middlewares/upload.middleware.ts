import multer from 'multer';
import type { RequestHandler } from 'express';
import { AppError } from '../shared/errors/AppError.js';

const uploadArchivos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const uploadFotosConfig = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const single = uploadArchivos.single('archivo');
const multipleFotos = uploadFotosConfig.array('fotos', 6);

function manejarErrorMulter(error: unknown): AppError | null {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new AppError(400, 'El archivo supera el tamaño máximo permitido');
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return new AppError(400, 'Se excedió el número máximo de fotos (6)');
    }

    return new AppError(400, `Error al procesar el archivo: ${error.message}`);
  }

  return null;
}

export const uploadArchivo: RequestHandler = (req, res, next) => {
  single(req, res, (error: unknown) => {
    const appError = manejarErrorMulter(error);

    if (appError) {
      next(appError);
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
};

export const uploadFotos: RequestHandler = (req, res, next) => {
  multipleFotos(req, res, (error: unknown) => {
    const appError = manejarErrorMulter(error);

    if (appError) {
      next(appError);
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
};

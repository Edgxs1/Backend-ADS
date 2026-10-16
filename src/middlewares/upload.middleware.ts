import multer from 'multer';
import type { RequestHandler } from 'express';
import { AppError } from '../shared/errors/AppError.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const single = upload.single('archivo');

export const uploadArchivo: RequestHandler = (req, res, next) => {
  single(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(new AppError(400, `Error al procesar el archivo: ${error.message}`));
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
};

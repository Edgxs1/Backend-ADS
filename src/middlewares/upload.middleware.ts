import multer from 'multer';
import type { RequestHandler } from 'express';
import { AppError } from '../shared/errors/AppError.js';

const MENSAJE_FORMATO_PDF =
  'Formato no permitido. Únicamente se aceptan documentos en formato PDF (.pdf).';
const MENSAJE_FORMATO_IMAGEN =
  'Formato de imagen no permitido. Únicamente se aceptan imágenes JPEG, PNG o WEBP.';
const MAGIC_PDF = '%PDF-';
const TIPOS_FOTO = new Set(['image/jpeg', 'image/png', 'image/webp']);

const uploadArchivos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const mimeValido = file.mimetype === 'application/pdf';
    const nombreValido = file.originalname.toLowerCase().endsWith('.pdf');

    if (!mimeValido || !nombreValido) {
      callback(new AppError(400, MENSAJE_FORMATO_PDF));
      return;
    }

    callback(null, true);
  },
});

const uploadFotosConfig = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!TIPOS_FOTO.has(file.mimetype)) {
      callback(new AppError(400, MENSAJE_FORMATO_IMAGEN));
      return;
    }

    callback(null, true);
  },
});

const single = uploadArchivos.single('archivo');
const multipleFotos = uploadFotosConfig.array('fotos', 6);

function validarFirmaPdf(archivo: Express.Multer.File): AppError | null {
  const firma = archivo.buffer.subarray(0, MAGIC_PDF.length).toString('ascii');

  if (firma !== MAGIC_PDF) {
    return new AppError(400, MENSAJE_FORMATO_PDF);
  }

  return null;
}

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

    if (req.file) {
      const errorFormato = validarFirmaPdf(req.file);

      if (errorFormato) {
        next(errorFormato);
        return;
      }
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

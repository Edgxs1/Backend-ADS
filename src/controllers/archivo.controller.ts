import type { NextFunction, Request, Response } from 'express';
import type { SubirArchivoDto } from '../schemas/archivo.schemas.js';
import {
  eliminarArchivoPorId,
  listarArchivosPorObra,
  subirArchivo,
} from '../services/archivo.service.js';
import { AppError } from '../shared/errors/AppError.js';

function requerirParam(req: Request, nombre: string): string {
  const raw = req.params[nombre];
  const valor = Array.isArray(raw) ? raw[0] : raw;

  if (!valor) {
    throw new AppError(400, `Falta el parámetro ${nombre}`);
  }

  return valor;
}

export async function subir(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idObra = requerirParam(req, 'id_obra');
    const user = req.user;

    if (!user) {
      throw new AppError(401, 'No autorizado: usuario no autenticado');
    }

    if (!req.file) {
      throw new AppError(400, 'No se envió ningún archivo en el campo "archivo"');
    }

    const { tipo_documento: tipoDocumento } = req.body as SubirArchivoDto;

    const archivo = await subirArchivo(idObra, user.id, tipoDocumento, {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      nombreOriginal: req.file.originalname,
    });

    res.status(201).json({ success: true, data: archivo });
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const archivos = await listarArchivosPorObra(requerirParam(req, 'id_obra'));

    res.status(200).json({ success: true, data: archivos });
  } catch (error) {
    next(error);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await eliminarArchivoPorId(requerirParam(req, 'id_archivo'));

    res.status(200).json({ success: true, data: { message: 'Archivo eliminado' } });
  } catch (error) {
    next(error);
  }
}

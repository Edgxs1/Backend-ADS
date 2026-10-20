import type { NextFunction, Request, Response } from 'express';
import {
  agregarFotos,
  eliminarFoto,
  listarFotosPorReporte,
} from '../services/reporte_fotos.service.js';
import type { DatosFoto } from '../repositories/reporte_fotos.repository.js';
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
    const idReporte = requerirParam(req, 'id_reporte');

    const archivos = (req.files as Express.Multer.File[] | undefined) ?? [];

    if (archivos.length === 0) {
      throw new AppError(400, 'No se envió ninguna foto en el campo "fotos"');
    }

    const fotos = await agregarFotos(
      idReporte,
      archivos.map<DatosFoto>((archivo) => ({
        buffer: archivo.buffer,
        mimetype: archivo.mimetype,
        nombreOriginal: archivo.originalname,
      })),
    );

    res.status(201).json({ success: true, data: fotos });
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fotos = await listarFotosPorReporte(requerirParam(req, 'id_reporte'));

    res.status(200).json({ success: true, data: fotos });
  } catch (error) {
    next(error);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await eliminarFoto(
      requerirParam(req, 'id_reporte'),
      requerirParam(req, 'id_foto'),
    );

    res.status(200).json({ success: true, data: { message: 'Foto eliminada' } });
  } catch (error) {
    next(error);
  }
}

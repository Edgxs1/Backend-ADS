import type { NextFunction, Request, Response } from 'express';
import type {
  CambiarEstadoReporteDto,
  CrearReporteDto,
} from '../schemas/reporte.schemas.js';
import {
  cambiarEstadoReporte,
  listarReportesPorObra,
  registrarReporte,
} from '../services/reporte.service.js';
import { AppError } from '../shared/errors/AppError.js';

function requerirParam(req: Request, nombre: string): string {
  const raw = req.params[nombre];
  const valor = Array.isArray(raw) ? raw[0] : raw;

  if (!valor) {
    throw new AppError(400, `Falta el parámetro ${nombre}`);
  }

  return valor;
}

function requerirUsuario(req: Request): string {
  const user = req.user;

  if (!user) {
    throw new AppError(401, 'No autorizado: usuario no autenticado');
  }

  return user.id;
}

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idObra = requerirParam(req, 'id_obra');
    const idCreador = requerirUsuario(req);

    const reporte = await registrarReporte(idObra, idCreador, req.body as CrearReporteDto);

    res.status(201).json({ success: true, data: reporte });
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reportes = await listarReportesPorObra(requerirParam(req, 'id_obra'));

    res.status(200).json({ success: true, data: reportes });
  } catch (error) {
    next(error);
  }
}

export async function actualizarEstado(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const idReporte = requerirParam(req, 'id_reporte');
    const idUsuario = requerirUsuario(req);

    const reporte = await cambiarEstadoReporte(
      idReporte,
      idUsuario,
      req.body as CambiarEstadoReporteDto,
    );

    res.status(200).json({ success: true, data: reporte });
  } catch (error) {
    next(error);
  }
}

import type { NextFunction, Request, Response } from 'express';
import {
  compendioPeriodoQuerySchema,
  type CrearCompendioDto,
} from '../schemas/compendio.schemas.js';
import {
  generarCompendio,
  listarCompendios,
  listarFotosReportesPeriodo,
  obtenerPeriodoCompendio,
} from '../services/compendio.service.js';
import { AppError } from '../shared/errors/AppError.js';

function requerirIdObra(req: Request): string {
  const raw = req.params['id_obra'];
  const idObra = Array.isArray(raw) ? raw[0] : raw;

  if (!idObra) {
    throw new AppError(400, 'Falta el parámetro id_obra');
  }

  return idObra;
}

function requerirUsuario(req: Request): string {
  const user = req.user;

  if (!user) {
    throw new AppError(401, 'No autorizado: usuario no autenticado');
  }

  return user.id;
}

export async function listar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const compendios = await listarCompendios(requerirIdObra(req));
    res.status(200).json({ success: true, data: compendios });
  } catch (error) {
    next(error);
  }
}

export async function periodo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = compendioPeriodoQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new AppError(400, 'Parámetros de consulta inválidos', query.error.issues);
    }

    const data = await obtenerPeriodoCompendio(
      requerirIdObra(req),
      query.data.mes,
      query.data.anio,
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function fotosPeriodo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = compendioPeriodoQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new AppError(400, 'Parámetros de consulta inválidos', query.error.issues);
    }

    const fotos = await listarFotosReportesPeriodo(
      requerirIdObra(req),
      query.data.mes,
      query.data.anio,
    );

    res.status(200).json({ success: true, data: fotos });
  } catch (error) {
    next(error);
  }
}

export async function generar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as CrearCompendioDto;
    const compendio = await generarCompendio(
      requerirIdObra(req),
      requerirUsuario(req),
      body,
    );

    res.status(201).json({ success: true, data: compendio });
  } catch (error) {
    next(error);
  }
}

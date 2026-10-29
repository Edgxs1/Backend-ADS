import type { NextFunction, Request, Response } from 'express';
import {
  modificarRecurso,
  obtenerRecursosActivosPorObra,
  obtenerRecursosPorObra,
  registrarRecurso,
} from '../services/recursos.service.js';
import { AppError } from '../shared/errors/AppError.js';

function requerirParam(req: Request, nombre: string): string {
  const raw = req.params[nombre];
  const valor = Array.isArray(raw) ? raw[0] : raw;

  if (!valor) {
    throw new AppError(400, `Falta el parámetro ${nombre}`);
  }

  return valor;
}

export async function listarRecursos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idObra = requerirParam(req, 'id');
    const recursos = await obtenerRecursosPorObra(idObra);

    res.status(200).json({ success: true, data: recursos });
  } catch (error) {
    next(error);
  }
}

export async function listarRecursosActivos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idObra = requerirParam(req, 'id');
    const recursos = await obtenerRecursosActivosPorObra(idObra);

    res.status(200).json({ success: true, data: recursos });
  } catch (error) {
    next(error);
  }
}

export async function crearRecursos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idObra = requerirParam(req, 'id');
    const recurso = await registrarRecurso(idObra, req.body);

    res.status(201).json({ success: true, data: recurso });
  } catch (error) {
    next(error);
  }
}

export async function actualizarRecursos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idRecurso = requerirParam(req, 'id_recurso');
    const recurso = await modificarRecurso(idRecurso, req.body);

    res.status(200).json({ success: true, data: recurso });
  } catch (error) {
    next(error);
  }
}

import type { NextFunction, Request, Response } from 'express';
import type {
  CrearNotaDto,
  EditarNotaDto,
} from '../schemas/bitacora.schemas.js';
import {
  editarNota,
  eliminarNota,
  firmarNota,
  listarNotasPorObra,
  registrarNota,
} from '../services/bitacora.service.js';
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

    const nota = await registrarNota(idObra, idCreador, req.body as CrearNotaDto);

    res.status(201).json({ success: true, data: nota });
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notas = await listarNotasPorObra(requerirParam(req, 'id_obra'));

    res.status(200).json({ success: true, data: notas });
  } catch (error) {
    next(error);
  }
}

export async function editar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idNota = requerirParam(req, 'id_nota');
    const idUsuario = requerirUsuario(req);

    const nota = await editarNota(idNota, idUsuario, req.body as EditarNotaDto);

    res.status(200).json({ success: true, data: nota });
  } catch (error) {
    next(error);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idNota = requerirParam(req, 'id_nota');
    const idUsuario = requerirUsuario(req);

    await eliminarNota(idNota, idUsuario);

    res.status(200).json({ success: true, data: { id_nota: idNota } });
  } catch (error) {
    next(error);
  }
}

export async function cambiarEstado(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const idNota = requerirParam(req, 'id_nota');
    const idUsuario = requerirUsuario(req);

    const nota = await firmarNota(idNota, idUsuario);

    res.status(200).json({ success: true, data: nota });
  } catch (error) {
    next(error);
  }
}

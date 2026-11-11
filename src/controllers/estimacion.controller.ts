import type { NextFunction, Request, Response } from 'express';
import type {
  ActualizarEstimacionDto,
  CambiarEstadoEstimacionDto,
  CorreccionEstatusDto,
  CrearEstimacionDto,
} from '../schemas/estimacion.schemas.js';
import {
  actualizarEstimacion,
  actualizarEstimacionPorId,
  autorizarEstimacion,
  cambiarEstadoEstimacionPorId,
  corregirEstatusEstimacion,
  eliminarEstimacion,
  enviarAResidente,
  enviarEstimacion,
  listarEstimacionesPorObra,
  obtenerCaratulaOficial,
  rechazarEstimacion,
  registrarEstimacion,
} from '../services/estimacion.service.js';
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
    const body = req.body as CrearEstimacionDto;
    const rawIdObra = req.params['id_obra'] ?? body.id_obra;
    const idObra = Array.isArray(rawIdObra) ? rawIdObra[0] : rawIdObra;

    if (!idObra) {
      throw new AppError(400, 'Falta el parámetro id_obra');
    }

    const estimacion = await registrarEstimacion(idObra, body);

    res.status(201).json({ success: true, data: estimacion });
  } catch (error) {
    next(error);
  }
}

export async function actualizar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as ActualizarEstimacionDto;
    const rawIdObra = req.params['id_obra'] ?? body.id_obra;
    const idObra = Array.isArray(rawIdObra) ? rawIdObra[0] : rawIdObra;

    if (!idObra) {
      throw new AppError(400, 'Falta el parámetro id_obra');
    }

    const estimacion = await actualizarEstimacion(
      idObra,
      requerirParam(req, 'id_estimacion'),
      body,
    );

    res.status(200).json({ success: true, data: estimacion });
  } catch (error) {
    next(error);
  }
}

export async function actualizarPorId(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as ActualizarEstimacionDto;

    const estimacion = await actualizarEstimacionPorId(
      requerirParam(req, 'id'),
      body,
    );

    res.status(200).json({ success: true, data: estimacion });
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const estimaciones = await listarEstimacionesPorObra(requerirParam(req, 'id_obra'));

    res.status(200).json({ success: true, data: estimaciones });
  } catch (error) {
    next(error);
  }
}

export async function enviar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const estimacion = await enviarEstimacion(
      requerirParam(req, 'id_obra'),
      requerirParam(req, 'id_estimacion'),
      requerirUsuario(req),
    );

    res.status(200).json({ success: true, data: estimacion });
  } catch (error) {
    next(error);
  }
}

export async function enviarResidente(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const estimacion = await enviarAResidente(
      requerirParam(req, 'id_obra'),
      requerirParam(req, 'id_estimacion'),
      requerirUsuario(req),
    );

    res.status(200).json({ success: true, data: estimacion });
  } catch (error) {
    next(error);
  }
}

export async function autorizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { password } = (req.body ?? {}) as { password?: string };

    const estimacion = await autorizarEstimacion(
      requerirParam(req, 'id_obra'),
      requerirParam(req, 'id_estimacion'),
      requerirUsuario(req),
      password,
    );

    res.status(200).json({ success: true, data: estimacion });
  } catch (error) {
    next(error);
  }
}

export async function rechazar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const estimacion = await rechazarEstimacion(
      requerirParam(req, 'id_obra'),
      requerirParam(req, 'id_estimacion'),
      requerirUsuario(req),
    );

    res.status(200).json({ success: true, data: estimacion });
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
    const { estado, password } = req.body as CambiarEstadoEstimacionDto;

    const estimacion = await cambiarEstadoEstimacionPorId(
      requerirParam(req, 'id'),
      estado,
      requerirUsuario(req),
      password,
    );

    res.status(200).json({ success: true, data: estimacion });
  } catch (error) {
    next(error);
  }
}

export async function correccionEstatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { estado } = req.body as CorreccionEstatusDto;

    const estimacion = await corregirEstatusEstimacion(
      requerirParam(req, 'id_obra'),
      requerirParam(req, 'id_estimacion'),
      estado,
    );

    res.status(200).json({ success: true, data: estimacion });
  } catch (error) {
    next(error);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idObra = requerirParam(req, 'id_obra');
    const idEstimacion = requerirParam(req, 'id_estimacion');

    await eliminarEstimacion(idObra, idEstimacion);

    res.status(200).json({ success: true, data: { id_estimacion: idEstimacion } });
  } catch (error) {
    next(error);
  }
}

export async function caratula(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const oficial = await obtenerCaratulaOficial(
      requerirParam(req, 'id_obra'),
      requerirParam(req, 'id_estimacion'),
    );

    res.status(200).json({ success: true, data: oficial });
  } catch (error) {
    next(error);
  }
}

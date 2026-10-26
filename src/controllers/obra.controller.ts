import type { NextFunction, Request, Response } from 'express';
import type { CrearObraDto } from '../schemas/obra.schemas.js';
import {
  desasignarUsuarioDeObra,
  eliminarObra,
  obtenerObras,
  obtenerObrasAsignadas,
  registrarObra,
} from '../services/obra.service.js';
import { AppError } from '../shared/errors/AppError.js';

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const obra = await registrarObra(req.body as CrearObraDto);
    res.status(201).json({ success: true, data: obra });
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const obras = await obtenerObras();
    res.status(200).json({ success: true, data: obras });
  } catch (error) {
    next(error);
  }
}

export async function listarAsignadas(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const idUsuario = req.user?.id;

    if (!idUsuario) {
      throw new AppError(401, 'No autorizado: usuario no autenticado');
    }

    const obras = await obtenerObrasAsignadas(idUsuario);
    res.status(200).json({ success: true, data: obras });
  } catch (error) {
    next(error);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawId = req.params['id'];
    const idObra = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!idObra) {
      throw new AppError(400, 'Falta el id de la obra');
    }

    await eliminarObra(idObra);
    res.status(200).json({ success: true, data: { message: 'Obra desactivada' } });
  } catch (error) {
    next(error);
  }
}

export async function desasignarUsuario(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawIdObra = req.params['id_obra'];
    const rawIdUsuario = req.params['id_usuario'];
    const idObra = Array.isArray(rawIdObra) ? rawIdObra[0] : rawIdObra;
    const idUsuario = Array.isArray(rawIdUsuario) ? rawIdUsuario[0] : rawIdUsuario;

    if (!idObra || !idUsuario) {
      throw new AppError(400, 'Faltan parámetros de la desasignación');
    }

    await desasignarUsuarioDeObra(idObra, idUsuario);
    res.status(200).json({
      success: true,
      data: { message: 'Usuario desvinculado de la obra' },
    });
  } catch (error) {
    next(error);
  }
}

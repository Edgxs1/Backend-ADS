import type { NextFunction, Request, Response } from 'express';
import type { CrearObraDto } from '../schemas/obra.schemas.js';
import { eliminarObra, obtenerObras, registrarObra } from '../services/obra.service.js';
import { AppError } from '../shared/errors/AppError.js';

function requerirToken(req: Request): string {
  if (!req.accessToken) {
    throw new AppError(401, 'No autorizado: token ausente');
  }
  return req.accessToken;
}

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const obra = await registrarObra(req.body as CrearObraDto, requerirToken(req));
    res.status(201).json({ success: true, data: obra });
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const obras = await obtenerObras(requerirToken(req));
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

    await eliminarObra(idObra, requerirToken(req));
    res.status(200).json({ success: true, data: { message: 'Obra desactivada' } });
  } catch (error) {
    next(error);
  }
}

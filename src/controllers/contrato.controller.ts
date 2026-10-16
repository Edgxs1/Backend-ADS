import type { NextFunction, Request, Response } from 'express';
import type { RegistrarContratoDto } from '../schemas/contrato.schemas.js';
import {
  consultarContratoPorObra,
  registrarContrato,
} from '../services/contrato.service.js';
import { AppError } from '../shared/errors/AppError.js';

function requerirIdObra(req: Request): string {
  const rawId = req.params['id_obra'];
  const idObra = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!idObra) {
    throw new AppError(400, 'Falta el id de la obra');
  }

  return idObra;
}

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contrato = await registrarContrato(requerirIdObra(req), req.body as RegistrarContratoDto);

    res.status(201).json({ success: true, data: contrato });
  } catch (error) {
    next(error);
  }
}

export async function obtener(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contrato = await consultarContratoPorObra(requerirIdObra(req));

    if (!contrato) {
      throw new AppError(404, 'Esta obra no tiene un contrato registrado');
    }

    res.status(200).json({ success: true, data: contrato });
  } catch (error) {
    next(error);
  }
}

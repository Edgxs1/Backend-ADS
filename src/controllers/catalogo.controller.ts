import type { NextFunction, Request, Response } from 'express';
import type { CrearConceptoDto } from '../schemas/catalogo.schemas.js';
import {
  listarCatalogosPorObra,
  registrarConcepto,
} from '../services/catalogo.service.js';
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
    const concepto = await registrarConcepto(requerirIdObra(req), req.body as CrearConceptoDto);

    res.status(201).json({ success: true, data: concepto });
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const catalogos = await listarCatalogosPorObra(requerirIdObra(req));

    res.status(200).json({ success: true, data: catalogos });
  } catch (error) {
    next(error);
  }
}

import type { NextFunction, Request, Response } from 'express';
import type { CrearPartidaDto } from '../schemas/partida.schemas.js';
import {
  listarPartidasPorObra,
  registrarPartida,
} from '../services/partida.service.js';
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
    const partida = await registrarPartida(requerirIdObra(req), req.body as CrearPartidaDto);

    res.status(201).json({ success: true, data: partida });
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const partidas = await listarPartidasPorObra(requerirIdObra(req));

    res.status(200).json({ success: true, data: partidas });
  } catch (error) {
    next(error);
  }
}

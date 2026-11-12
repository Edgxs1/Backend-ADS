import type { NextFunction, Request, Response } from 'express';
import { dashboardQuerySchema } from '../schemas/dashboard.schemas.js';
import { obtenerDashboardObra } from '../services/dashboard.service.js';
import { AppError } from '../shared/errors/AppError.js';

export async function dashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawIdObra = req.params['id_obra'];
    const idObra = Array.isArray(rawIdObra) ? rawIdObra[0] : rawIdObra;

    if (!idObra) {
      throw new AppError(400, 'Falta el parámetro id_obra');
    }

    const query = dashboardQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new AppError(400, 'Parámetros de consulta inválidos', query.error.issues);
    }

    const data = await obtenerDashboardObra(idObra, query.data.agrupacion);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

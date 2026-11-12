import { Router } from 'express';
import {
  fotosPeriodo,
  generar,
  listar,
  periodo,
} from '../controllers/compendio.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  compendioObraParamsSchema,
  crearCompendioSchema,
} from '../schemas/compendio.schemas.js';

export const compendioRouter = Router();

const ROLES_LECTURA = [
  'Administrador',
  'Superintendente',
  'Supervisor',
  'Residente',
  'Directivo',
] as const;

compendioRouter.get(
  '/:id_obra/compendios',
  authMiddleware,
  validateParams(compendioObraParamsSchema),
  roleMiddleware(...ROLES_LECTURA, { scope: 'obra' }),
  listar,
);

compendioRouter.get(
  '/:id_obra/reportes-fotos',
  authMiddleware,
  validateParams(compendioObraParamsSchema),
  roleMiddleware(...ROLES_LECTURA, { scope: 'obra' }),
  fotosPeriodo,
);

compendioRouter.get(
  '/:id_obra/compendios/periodo',
  authMiddleware,
  validateParams(compendioObraParamsSchema),
  roleMiddleware(...ROLES_LECTURA, { scope: 'obra' }),
  periodo,
);

compendioRouter.post(
  '/:id_obra/compendios',
  authMiddleware,
  validateParams(compendioObraParamsSchema),
  roleMiddleware('Supervisor', { scope: 'obra' }),
  validateBody(crearCompendioSchema),
  generar,
);

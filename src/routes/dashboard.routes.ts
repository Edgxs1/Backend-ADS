import { Router } from 'express';
import { dashboard } from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateParams } from '../middlewares/validate.middleware.js';
import { dashboardObraParamsSchema } from '../schemas/dashboard.schemas.js';

export const dashboardRouter = Router();

const ROLES_OPERATIVOS = [
  'Administrador',
  'Superintendente',
  'Supervisor',
  'Residente',
  'Directivo',
] as const;

dashboardRouter.get(
  '/:id_obra/dashboard',
  authMiddleware,
  validateParams(dashboardObraParamsSchema),
  roleMiddleware(...ROLES_OPERATIVOS, { scope: 'obra' }),
  dashboard,
);

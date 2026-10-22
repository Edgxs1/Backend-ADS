import { Router } from 'express';
import {
  autorizar,
  caratula,
  correccionEstatus,
  crear,
  eliminar,
  enviar,
  listar,
  rechazar,
} from '../controllers/estimacion.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  correccionEstatusSchema,
  crearEstimacionSchema,
  estimacionObraParamsSchema,
  estimacionParamsSchema,
} from '../schemas/estimacion.schemas.js';

export const estimacionRouter = Router();

const ROLES_OPERATIVOS = [
  'Administrador',
  'Superintendente',
  'Supervisor',
  'Residente',
  'Directivo',
] as const;

estimacionRouter.post(
  '/:id_obra/estimaciones',
  authMiddleware,
  validateParams(estimacionObraParamsSchema),
  roleMiddleware('Superintendente', { scope: 'obra' }),
  validateBody(crearEstimacionSchema),
  crear,
);

estimacionRouter.get(
  '/:id_obra/estimaciones',
  authMiddleware,
  validateParams(estimacionObraParamsSchema),
  roleMiddleware(...ROLES_OPERATIVOS, { scope: 'obra' }),
  listar,
);

estimacionRouter.patch(
  '/:id_obra/estimaciones/:id_estimacion/enviar',
  authMiddleware,
  validateParams(estimacionParamsSchema),
  roleMiddleware('Superintendente', { scope: 'obra' }),
  enviar,
);

estimacionRouter.patch(
  '/:id_obra/estimaciones/:id_estimacion/autorizar',
  authMiddleware,
  validateParams(estimacionParamsSchema),
  roleMiddleware('Residente', { scope: 'obra' }),
  autorizar,
);

estimacionRouter.patch(
  '/:id_obra/estimaciones/:id_estimacion/rechazar',
  authMiddleware,
  validateParams(estimacionParamsSchema),
  roleMiddleware('Residente', { scope: 'obra' }),
  rechazar,
);

estimacionRouter.patch(
  '/:id_obra/estimaciones/:id_estimacion/correccion-estatus',
  authMiddleware,
  validateParams(estimacionParamsSchema),
  roleMiddleware('Administrador', { scope: 'obra' }),
  validateBody(correccionEstatusSchema),
  correccionEstatus,
);

estimacionRouter.delete(
  '/:id_obra/estimaciones/:id_estimacion',
  authMiddleware,
  validateParams(estimacionParamsSchema),
  roleMiddleware('Superintendente', { scope: 'obra' }),
  eliminar,
);

estimacionRouter.get(
  '/:id_obra/estimaciones/:id_estimacion/caratula',
  authMiddleware,
  validateParams(estimacionParamsSchema),
  roleMiddleware(...ROLES_OPERATIVOS, { scope: 'obra' }),
  caratula,
);

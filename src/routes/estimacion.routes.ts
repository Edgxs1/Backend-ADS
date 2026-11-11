import { Router } from 'express';
import {
  actualizar,
  actualizarPorId,
  autorizar,
  cambiarEstado,
  caratula,
  correccionEstatus,
  crear,
  eliminar,
  enviar,
  enviarResidente,
  listar,
  rechazar,
} from '../controllers/estimacion.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  actualizarEstimacionSchema,
  cambiarEstadoEstimacionSchema,
  correccionEstatusSchema,
  crearEstimacionSchema,
  estimacionIdParamsSchema,
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

estimacionRouter.put(
  '/:id_obra/estimaciones/:id_estimacion',
  authMiddleware,
  validateParams(estimacionParamsSchema),
  roleMiddleware('Superintendente', { scope: 'obra' }),
  validateBody(actualizarEstimacionSchema),
  actualizar,
);

estimacionRouter.get(
  '/:id_obra/estimaciones',
  authMiddleware,
  validateParams(estimacionObraParamsSchema),
  roleMiddleware(...ROLES_OPERATIVOS, { scope: 'obra' }),
  listar,
);

estimacionRouter.patch(
  '/:id_obra/estimaciones/:id_estimacion/enviar-supervisor',
  authMiddleware,
  validateParams(estimacionParamsSchema),
  roleMiddleware('Superintendente', { scope: 'obra' }),
  enviar,
);

estimacionRouter.patch(
  '/:id_obra/estimaciones/:id_estimacion/enviar',
  authMiddleware,
  validateParams(estimacionParamsSchema),
  roleMiddleware('Superintendente', { scope: 'obra' }),
  enviar,
);

estimacionRouter.patch(
  '/:id_obra/estimaciones/:id_estimacion/enviar-residente',
  authMiddleware,
  validateParams(estimacionParamsSchema),
  roleMiddleware('Supervisor', { scope: 'obra' }),
  enviarResidente,
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

/**
 * Endpoints directos solicitados por el RF3:
 *   POST   /api/v1/estimaciones
 *   PUT    /api/v1/estimaciones/:id/estado
 *   GET    /api/v1/estimaciones/:id_obra
 */
export const estimacionDirectaRouter = Router();

estimacionDirectaRouter.post(
  '/',
  authMiddleware,
  roleMiddleware('Superintendente', { scope: 'obra' }),
  validateBody(crearEstimacionSchema),
  crear,
);

estimacionDirectaRouter.put(
  '/:id/estado',
  authMiddleware,
  validateParams(estimacionIdParamsSchema),
  roleMiddleware('Administrador', 'Supervisor', 'Residente'),
  validateBody(cambiarEstadoEstimacionSchema),
  cambiarEstado,
);

estimacionDirectaRouter.patch(
  '/:id/estado',
  authMiddleware,
  validateParams(estimacionIdParamsSchema),
  roleMiddleware(
    'Administrador',
    'Superintendente',
    'Supervisor',
    'Residente',
  ),
  validateBody(cambiarEstadoEstimacionSchema),
  cambiarEstado,
);

estimacionDirectaRouter.put(
  '/:id',
  authMiddleware,
  validateParams(estimacionIdParamsSchema),
  roleMiddleware('Superintendente', { scope: 'obra' }),
  validateBody(actualizarEstimacionSchema),
  actualizarPorId,
);

estimacionDirectaRouter.get(
  '/:id_obra',
  authMiddleware,
  validateParams(estimacionObraParamsSchema),
  roleMiddleware(...ROLES_OPERATIVOS, { scope: 'obra' }),
  listar,
);

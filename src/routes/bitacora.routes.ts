import { Router } from 'express';
import {
  cambiarEstado,
  crear,
  editar,
  eliminar,
  firmar,
  firmarNotaController,
  listar,
} from '../controllers/bitacora.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  bitacoraObraParamsSchema,
  crearNotaSchema,
  editarNotaSchema,
  firmarNotaSchema,
  notaIdParamsSchema,
  notaParamsSchema,
} from '../schemas/bitacora.schemas.js';

export const bitacoraRouter = Router();

const ROLES_OPERATIVOS = [
  'Superintendente',
  'Supervisor',
  'Residente',
] as const;

const ROLES_FIRMANTES = ['Superintendente', 'Supervisor', 'Residente'] as const;

bitacoraRouter.post(
  '/:id_obra/bitacora',
  authMiddleware,
  validateParams(bitacoraObraParamsSchema),
  roleMiddleware(...ROLES_OPERATIVOS, { scope: 'obra' }),
  validateBody(crearNotaSchema),
  crear,
);

bitacoraRouter.get(
  '/:id_obra/bitacora',
  authMiddleware,
  validateParams(bitacoraObraParamsSchema),
  roleMiddleware('Administrador', ...ROLES_OPERATIVOS),
  listar,
);

bitacoraRouter.patch(
  '/:id_obra/bitacora/:id_nota',
  authMiddleware,
  validateParams(notaParamsSchema),
  roleMiddleware('Administrador', ...ROLES_OPERATIVOS),
  validateBody(editarNotaSchema),
  editar,
);

bitacoraRouter.delete(
  '/:id_obra/bitacora/:id_nota',
  authMiddleware,
  validateParams(notaParamsSchema),
  roleMiddleware('Administrador', ...ROLES_OPERATIVOS),
  eliminar,
);

bitacoraRouter.patch(
  '/:id_obra/bitacora/:id_nota/estado',
  authMiddleware,
  validateParams(notaParamsSchema),
  roleMiddleware(...ROLES_FIRMANTES, { scope: 'obra' }),
  cambiarEstado,
);

bitacoraRouter.patch(
  '/:id_obra/bitacora/:id_nota/firmar',
  authMiddleware,
  validateParams(notaParamsSchema),
  roleMiddleware(...ROLES_FIRMANTES, { scope: 'obra' }),
  cambiarEstado,
);

bitacoraRouter.post(
  '/:id/firmar',
  authMiddleware,
  roleMiddleware(...ROLES_FIRMANTES),
  validateBody(firmarNotaSchema),
  firmarNotaController,
);

export const bitacoraNotaRouter = Router();

bitacoraNotaRouter.put(
  '/:id',
  authMiddleware,
  validateParams(notaIdParamsSchema),
  roleMiddleware('Administrador', ...ROLES_OPERATIVOS),
  validateBody(editarNotaSchema),
  editar,
);

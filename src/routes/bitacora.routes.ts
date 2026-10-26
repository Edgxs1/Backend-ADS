import { Router } from 'express';
import {
  cambiarEstado,
  crear,
  editar,
  eliminar,
  listar,
} from '../controllers/bitacora.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  bitacoraObraParamsSchema,
  crearNotaSchema,
  editarNotaSchema,
  notaParamsSchema,
} from '../schemas/bitacora.schemas.js';

export const bitacoraRouter = Router();

const ROLES_OPERATIVOS = [
  'Administrador',
  'Superintendente',
  'Supervisor',
  'Residente',
  'Directivo',
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
  roleMiddleware(...ROLES_OPERATIVOS, { scope: 'obra' }),
  listar,
);

bitacoraRouter.patch(
  '/:id_obra/bitacora/:id_nota',
  authMiddleware,
  validateParams(notaParamsSchema),
  roleMiddleware(...ROLES_OPERATIVOS, { scope: 'obra' }),
  validateBody(editarNotaSchema),
  editar,
);

bitacoraRouter.delete(
  '/:id_obra/bitacora/:id_nota',
  authMiddleware,
  validateParams(notaParamsSchema),
  roleMiddleware(...ROLES_OPERATIVOS, { scope: 'obra' }),
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

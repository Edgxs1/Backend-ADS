import { Router } from 'express';
import { crear, obtener } from '../controllers/contrato.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import { contratoObraParamsSchema, registrarContratoSchema } from '../schemas/contrato.schemas.js';

export const contratoRouter = Router();

contratoRouter.post(
  '/:id_obra/contrato',
  authMiddleware,
  validateParams(contratoObraParamsSchema),
  roleMiddleware('Administrador', { scope: 'obra' }),
  validateBody(registrarContratoSchema),
  crear,
);

contratoRouter.get(
  '/:id_obra/contrato',
  authMiddleware,
  validateParams(contratoObraParamsSchema),
  roleMiddleware(
    'Administrador',
    'Superintendente',
    'Supervisor',
    'Residente',
    'Directivo',
    { scope: 'obra' },
  ),
  obtener,
);

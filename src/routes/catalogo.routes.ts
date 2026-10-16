import { Router } from 'express';
import { crear, listar } from '../controllers/catalogo.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import { catalogoObraParamsSchema, crearConceptoSchema } from '../schemas/catalogo.schemas.js';

export const catalogoRouter = Router();

catalogoRouter.post(
  '/:id_obra/catalogos',
  authMiddleware,
  validateParams(catalogoObraParamsSchema),
  roleMiddleware('Superintendente', 'Administrador', { scope: 'obra' }),
  validateBody(crearConceptoSchema),
  crear,
);

catalogoRouter.get(
  '/:id_obra/catalogos',
  authMiddleware,
  validateParams(catalogoObraParamsSchema),
  roleMiddleware(
    'Administrador',
    'Superintendente',
    'Supervisor',
    'Residente',
    'Directivo',
    { scope: 'obra' },
  ),
  listar,
);

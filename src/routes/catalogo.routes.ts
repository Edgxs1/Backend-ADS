import { Router } from 'express';
import { crear, listar } from '../controllers/catalogo.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import { catalogoObraParamsSchema, crearConceptoSchema } from '../schemas/catalogo.schemas.js';
import {
  actualizarRecursos,
  crearRecursos,
  listarRecursos,
} from '../controllers/recursos.controller.js';
import {
  actualizarRecursoSchema,
  crearRecursoSchema,
  recursoIdParamsSchema,
  recursoObraParamsSchema,
} from '../schemas/recurso.schemas.js';

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

catalogoRouter.get(
  '/:id/recursos',
  authMiddleware,
  validateParams(recursoObraParamsSchema),
  roleMiddleware(
    'Administrador',
    'Superintendente',
    'Supervisor',
    'Residente',
    'Directivo',
    { scope: 'obra' },
  ),
  listarRecursos,
);

catalogoRouter.post(
  '/:id/recursos',
  authMiddleware,
  validateParams(recursoObraParamsSchema),
  roleMiddleware('Administrador', { scope: 'obra' }),
  validateBody(crearRecursoSchema),
  crearRecursos,
);

catalogoRouter.put(
  '/:id/recursos/:id_recurso',
  authMiddleware,
  validateParams(recursoIdParamsSchema),
  roleMiddleware('Administrador', { scope: 'obra' }),
  validateBody(actualizarRecursoSchema),
  actualizarRecursos,
);

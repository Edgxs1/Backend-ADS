import { Router } from 'express';
import { crear, listar } from '../controllers/partida.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import { crearPartidaSchema, partidaObraParamsSchema } from '../schemas/partida.schemas.js';

export const partidaRouter = Router();

partidaRouter.post(
  '/:id_obra/partidas',
  authMiddleware,
  validateParams(partidaObraParamsSchema),
  roleMiddleware('Superintendente', 'Administrador', { scope: 'obra' }),
  validateBody(crearPartidaSchema),
  crear,
);

partidaRouter.get(
  '/:id_obra/partidas',
  authMiddleware,
  validateParams(partidaObraParamsSchema),
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

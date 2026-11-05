import { Router } from 'express';
import { actualizar, crear, eliminar, listar } from '../controllers/partida.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  actualizarPartidaSchema,
  crearPartidaSchema,
  partidaIdParamsSchema,
  partidaObraParamsSchema,
} from '../schemas/partida.schemas.js';

export const partidaRouter = Router();

partidaRouter.post(
  '/:id_obra/partidas',
  authMiddleware,
  validateParams(partidaObraParamsSchema),
  roleMiddleware('Superintendente', 'Administrador', { scope: 'obra' }),
  validateBody(crearPartidaSchema),
  crear,
);

partidaRouter.put(
  '/:id_obra/partidas/:id_partida',
  authMiddleware,
  validateParams(partidaIdParamsSchema),
  roleMiddleware('Superintendente', 'Administrador', { scope: 'obra' }),
  validateBody(actualizarPartidaSchema),
  actualizar,
);

partidaRouter.delete(
  '/:id_obra/partidas/:id_partida',
  authMiddleware,
  validateParams(partidaIdParamsSchema),
  roleMiddleware('Superintendente', 'Administrador', { scope: 'obra' }),
  eliminar,
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

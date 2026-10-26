import { Router } from 'express';
import {
  crear,
  desasignarUsuario,
  eliminar,
  listar,
  listarAsignadas,
} from '../controllers/obra.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  crearObraSchema,
  obraIdParamsSchema,
  obraUsuarioParamsSchema,
} from '../schemas/obra.schemas.js';

export const obraRouter = Router();

// Solo autenticación: cada usuario obtiene las obras a las que tiene acceso.
obraRouter.get('/asignadas', authMiddleware, listarAsignadas);

obraRouter.use(authMiddleware, roleMiddleware('Administrador', { scope: 'global' }));

obraRouter.post('/', validateBody(crearObraSchema), crear);
obraRouter.get('/', listar);
obraRouter.delete(
  '/:id_obra/usuarios/:id_usuario',
  validateParams(obraUsuarioParamsSchema),
  desasignarUsuario,
);
obraRouter.delete('/:id', validateParams(obraIdParamsSchema), eliminar);

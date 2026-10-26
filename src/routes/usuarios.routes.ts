import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import {
  validateBody,
  validateParams,
} from '../middlewares/validate.middleware.js';
import {
  actualizarPerfilPropio,
  cambiarPassword,
  me,
} from '../controllers/usuarios.controller.js';
import { actualizarEstado } from '../controllers/admin.controller.js';
import {
  actualizarPerfilSchema,
  cambiarPasswordSchema,
  estadoUsuarioSchema,
} from '../schemas/usuarios.schemas.js';
import { idUsuarioParamsSchema } from '../schemas/admin.schemas.js';

export const usuariosRouter = Router();

usuariosRouter.use(authMiddleware);

usuariosRouter.get('/me', me);
usuariosRouter.patch('/perfil', validateBody(actualizarPerfilSchema), actualizarPerfilPropio);
usuariosRouter.patch(
  '/perfil/contrasena',
  validateBody(cambiarPasswordSchema),
  cambiarPassword,
);

usuariosRouter.patch(
  '/:id_usuario/estado',
  validateParams(idUsuarioParamsSchema),
  roleMiddleware('Administrador', { scope: 'global' }),
  validateBody(estadoUsuarioSchema),
  actualizarEstado,
);

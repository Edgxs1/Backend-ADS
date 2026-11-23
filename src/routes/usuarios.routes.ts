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

const ROLES_AUTOGESTION = [
  'Administrador',
  'Superintendente',
  'Supervisor',
  'Residente',
] as const;

usuariosRouter.get('/me', me);
usuariosRouter.patch(
  '/perfil',
  roleMiddleware(...ROLES_AUTOGESTION, { scope: 'global' }),
  validateBody(actualizarPerfilSchema),
  actualizarPerfilPropio,
);
usuariosRouter.patch(
  '/perfil/contrasena',
  roleMiddleware(...ROLES_AUTOGESTION, { scope: 'global' }),
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

import { Router } from 'express';
import {
  actualizarRol,
  asignar,
  crearUsuario,
  listarAsignaciones,
  listarUsuarios,
} from '../controllers/admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  actualizarRolSchema,
  asignarSchema,
  crearUsuarioSchema,
  idObraParamsSchema,
  idUsuarioParamsSchema,
} from '../schemas/admin.schemas.js';

export const adminRouter = Router();

adminRouter.use(authMiddleware, roleMiddleware('Administrador', { scope: 'global' }));

adminRouter.post('/usuarios', validateBody(crearUsuarioSchema), crearUsuario);
adminRouter.get('/usuarios', listarUsuarios);
adminRouter.patch(
  '/usuarios/:id_usuario/rol',
  validateParams(idUsuarioParamsSchema),
  validateBody(actualizarRolSchema),
  actualizarRol,
);

adminRouter.post('/asignar', validateBody(asignarSchema), asignar);
adminRouter.get(
  '/obras/:id_obra/asignaciones',
  validateParams(idObraParamsSchema),
  listarAsignaciones,
);

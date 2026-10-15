import { Router } from 'express';
import {
  actualizarRol,
  asignar,
  crearUsuario,
} from '../controllers/admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  actualizarRolSchema,
  asignarSchema,
  crearUsuarioSchema,
} from '../schemas/admin.schemas.js';

export const adminRouter = Router();

adminRouter.use(authMiddleware, roleMiddleware('Administrador', { scope: 'global' }));

adminRouter.post('/usuarios', validateBody(crearUsuarioSchema), crearUsuario);
adminRouter.patch(
  '/usuarios/:id_usuario/rol',
  validateBody(actualizarRolSchema),
  actualizarRol,
);
adminRouter.post('/asignar', validateBody(asignarSchema), asignar);

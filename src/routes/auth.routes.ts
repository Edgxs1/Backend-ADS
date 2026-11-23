import { Router } from 'express';
import { login, resetPassword, updatePassword } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  loginSchema,
  recuperarSchema,
  restablecerSchema,
} from '../schemas/auth.schemas.js';

export const authRouter = Router();

authRouter.post('/login', validateBody(loginSchema), login);
authRouter.post('/reset-password', validateBody(recuperarSchema), resetPassword);
authRouter.post(
  '/update-password',
  authMiddleware,
  roleMiddleware('Administrador', 'Superintendente', 'Supervisor', 'Residente', {
    scope: 'global',
  }),
  validateBody(restablecerSchema),
  updatePassword,
);

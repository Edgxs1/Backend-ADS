import { Router } from 'express';
import { listar } from '../controllers/pendientes.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

export const pendientesRouter = Router();

const ROLES = [
  'Administrador',
  'Superintendente',
  'Supervisor',
  'Residente',
  'Directivo',
] as const;

pendientesRouter.get(
  '/',
  authMiddleware,
  roleMiddleware(...ROLES, { scope: 'global' }),
  listar,
);

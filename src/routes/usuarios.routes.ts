import { Router } from 'express';
import { me } from '../controllers/usuarios.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

export const usuariosRouter = Router();

usuariosRouter.use(authMiddleware);

usuariosRouter.get('/me', me);

import { Router } from 'express';
import { crear, eliminar, listar } from '../controllers/obra.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { crearObraSchema } from '../schemas/obra.schemas.js';

export const obraRouter = Router();

obraRouter.use(authMiddleware, roleMiddleware('Administrador', { scope: 'global' }));

obraRouter.post('/', validateBody(crearObraSchema), crear);
obraRouter.get('/', listar);
obraRouter.delete('/:id', eliminar);

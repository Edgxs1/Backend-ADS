import { Router } from 'express';
import { eliminar, listar, subir } from '../controllers/archivo.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { uploadArchivo } from '../middlewares/upload.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  archivoObraParamsSchema,
  archivoParamsSchema,
  subirArchivoSchema,
} from '../schemas/archivo.schemas.js';

export const archivoRouter = Router();

archivoRouter.post(
  '/:id_obra/archivos',
  authMiddleware,
  validateParams(archivoObraParamsSchema),
  roleMiddleware(
    'Administrador',
    'Superintendente',
    'Supervisor',
    'Residente',
    'Directivo',
    { scope: 'obra' },
  ),
  uploadArchivo,
  validateBody(subirArchivoSchema),
  subir,
);

archivoRouter.get(
  '/:id_obra/archivos',
  authMiddleware,
  validateParams(archivoObraParamsSchema),
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

archivoRouter.delete(
  '/:id_obra/archivos/:id_archivo',
  authMiddleware,
  validateParams(archivoParamsSchema),
  roleMiddleware('Administrador', { scope: 'obra' }),
  eliminar,
);

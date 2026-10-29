import { Router } from 'express';
import {
  actualizar,
  actualizarEstado,
  crear,
  listar,
} from '../controllers/reporte.controller.js';
import {
  eliminar as eliminarFoto,
  listar as listarFotos,
  subir as subirFotos,
} from '../controllers/reporte_fotos.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { uploadFotos } from '../middlewares/upload.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  cambiarEstadoReporteSchema,
  crearReporteSchema,
  fotoParamsSchema,
  reporteObraParamsSchema,
  reporteParamsSchema,
} from '../schemas/reporte.schemas.js';

export const reporteRouter = Router();

const ROLES_OPERATIVOS = [
  'Administrador',
  'Superintendente',
  'Supervisor',
  'Residente',
  'Directivo',
] as const;

reporteRouter.post(
  '/:id_obra/reportes',
  authMiddleware,
  validateParams(reporteObraParamsSchema),
  roleMiddleware('Supervisor', { scope: 'obra' }),
  validateBody(crearReporteSchema),
  crear,
);

reporteRouter.put(
  '/:id_obra/reportes/:id_reporte',
  authMiddleware,
  validateParams(reporteParamsSchema),
  roleMiddleware('Supervisor', { scope: 'obra' }),
  validateBody(crearReporteSchema),
  actualizar,
);

reporteRouter.get(
  '/:id_obra/reportes',
  authMiddleware,
  validateParams(reporteObraParamsSchema),
  roleMiddleware(...ROLES_OPERATIVOS, { scope: 'obra' }),
  listar,
);

reporteRouter.patch(
  '/:id_obra/reportes/:id_reporte/estado',
  authMiddleware,
  validateParams(reporteParamsSchema),
  roleMiddleware('Residente', 'Administrador', { scope: 'obra' }),
  validateBody(cambiarEstadoReporteSchema),
  actualizarEstado,
);

reporteRouter.post(
  '/:id_obra/reportes/:id_reporte/fotos',
  authMiddleware,
  validateParams(reporteParamsSchema),
  roleMiddleware('Supervisor', { scope: 'obra' }),
  uploadFotos,
  subirFotos,
);

reporteRouter.get(
  '/:id_obra/reportes/:id_reporte/fotos',
  authMiddleware,
  validateParams(reporteParamsSchema),
  roleMiddleware(...ROLES_OPERATIVOS, { scope: 'obra' }),
  listarFotos,
);

reporteRouter.delete(
  '/:id_obra/reportes/:id_reporte/fotos/:id_foto',
  authMiddleware,
  validateParams(fotoParamsSchema),
  roleMiddleware('Supervisor', { scope: 'obra' }),
  eliminarFoto,
);

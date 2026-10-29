import { z } from 'zod';

export const recursoObraParamsSchema = z.object({
  id: z.uuid(),
});

export const crearRecursoSchema = z.object({
  tipo: z.enum(['PERSONAL', 'MAQUINARIA', 'EQUIPO']),
  descripcion: z.string().trim().min(2, 'La descripción debe tener al menos 2 caracteres'),
});

export const actualizarRecursoSchema = z.object({
  descripcion: z.string().trim().min(2).optional(),
  activo: z.boolean().optional(),
});

export const recursoIdParamsSchema = z.object({
  id: z.uuid(),
  id_recurso: z.uuid(),
});

export type RecursoObraParamsDto = z.infer<typeof recursoObraParamsSchema>;
export type CrearRecursoDto = z.infer<typeof crearRecursoSchema>;
export type ActualizarRecursoDto = z.infer<typeof actualizarRecursoSchema>;
export type RecursoIdParamsDto = z.infer<typeof recursoIdParamsSchema>;

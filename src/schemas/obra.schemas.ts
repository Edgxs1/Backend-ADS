import { z } from 'zod';

export const crearObraSchema = z.object({
  nombre: z.string().min(1).max(200),
  tipo_edificacion: z.string().max(150).optional(),
  num_habitaciones: z.number().int().nonnegative().optional(),
});

export const obraIdParamsSchema = z.object({
  id: z.uuid(),
});

export type CrearObraDto = z.infer<typeof crearObraSchema>;

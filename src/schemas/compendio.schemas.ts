import { z } from 'zod';

export const MAX_FOTOS_COMPENDIO = 12;

export const compendioObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export const compendioPeriodoQuerySchema = z.object({
  mes: z.coerce.number().int().min(1).max(12),
  anio: z.coerce.number().int().min(2000).max(2100),
});

export const crearCompendioSchema = z.object({
  mes: z.number().int().min(1).max(12),
  anio: z.number().int().min(2000).max(2100),
  fotografias: z
    .array(z.object({ id_foto: z.uuid() }))
    .min(1, 'Selecciona al menos una fotografía')
    .max(MAX_FOTOS_COMPENDIO),
});

export type CompendioPeriodoQuery = z.infer<typeof compendioPeriodoQuerySchema>;
export type CrearCompendioDto = z.infer<typeof crearCompendioSchema>;

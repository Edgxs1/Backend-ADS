import { z } from 'zod';

export const TIPOS_CONCEPTO = ['Normal', 'Adicional', 'Extraordinario'] as const;

export const crearConceptoSchema = z.object({
  id_partida: z.uuid(),
  tipo: z.enum(TIPOS_CONCEPTO),
  clave: z.string().trim().min(1).max(100),
  descripcion: z.string().trim().min(3).max(500),
  unidad_medida: z.string().trim().min(1).max(50),
  cantidad: z.number().positive(),
  precio_unitario: z.number().positive(),
});

export const catalogoObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export type CrearConceptoDto = z.infer<typeof crearConceptoSchema>;

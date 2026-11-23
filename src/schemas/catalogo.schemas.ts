import { z } from 'zod';
import { TIPOS_ESTIMACION } from './estimacion.schemas.js';

export const TIPOS_CONCEPTO = ['Normal', 'Adicional', 'Extraordinario'] as const;

const fechaSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)');

export const crearConceptoSchema = z.object({
  id_partida: z.uuid(),
  tipo: z.enum(TIPOS_CONCEPTO),
  clave: z.string().trim().min(1).max(100),
  descripcion: z.string().trim().min(3).max(500),
  unidad_medida: z.string().trim().min(1).max(50),
  cantidad: z.number().positive(),
  precio_unitario: z.number().positive(),
});

export const actualizarConceptoSchema = crearConceptoSchema;

export const catalogoObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export const catalogoConceptoParamsSchema = z.object({
  id_obra: z.uuid(),
  id_concepto: z.uuid(),
});

export const catalogoListadoQuerySchema = z.object({
  tipo_estimacion: z.enum(TIPOS_ESTIMACION).optional(),
  fecha_corte: fechaSchema.optional(),
  excluir_id_estimacion: z.uuid().optional(),
});

export type CrearConceptoDto = z.infer<typeof crearConceptoSchema>;
export type CatalogoListadoQueryDto = z.infer<typeof catalogoListadoQuerySchema>;
export type ActualizarConceptoDto = z.infer<typeof actualizarConceptoSchema>;

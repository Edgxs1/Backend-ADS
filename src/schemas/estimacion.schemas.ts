import { z } from 'zod';

export const TIPOS_ESTIMACION = ['Ordinaria', 'Extraordinaria', 'Adicional'] as const;

export const ESTADOS_ESTIMACION = [
  'Borrador',
  'Revision Supervisor',
  'Revision Residente',
  'Autorizada',
  'Rechazada',
] as const;

export const TIPOS_CON_TOPES_25 = ['Extraordinaria', 'Adicional'] as const;

const fechaSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)');

export const conceptosEstimacionSchema = z
  .array(
    z.object({
      id_concepto: z.uuid(),
      cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
    }),
  )
  .min(1, 'Debe incluir al menos un concepto');

export const crearEstimacionSchema = z
  .object({
    tipo: z.enum(TIPOS_ESTIMACION, 'Tipo de estimación inválido'),
    fecha: fechaSchema,
    periodo_inicio: fechaSchema,
    periodo_fin: fechaSchema,
    conceptos: conceptosEstimacionSchema,
  })
  .refine(
    (data) => data.periodo_fin >= data.periodo_inicio,
    {
      message: 'El periodo_fin no puede ser anterior al periodo_inicio',
      path: ['periodo_fin'],
    },
  );

export const estimacionObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export const estimacionParamsSchema = z.object({
  id_obra: z.uuid(),
  id_estimacion: z.uuid(),
});

export const correccionEstatusSchema = z.object({
  estado: z.enum(ESTADOS_ESTIMACION, 'Estado inválido'),
});

export type CrearEstimacionDto = z.infer<typeof crearEstimacionSchema>;
export type ConceptoEstimacionDto = z.infer<typeof conceptosEstimacionSchema>[number];
export type TipoEstimacion = (typeof TIPOS_ESTIMACION)[number];
export type EstadoEstimacion = (typeof ESTADOS_ESTIMACION)[number];
export type CorreccionEstatusDto = z.infer<typeof correccionEstatusSchema>;

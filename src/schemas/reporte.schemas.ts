import { z } from 'zod';

export const ESTADOS_REPORTE = ['Validado', 'Por revisar'] as const;

export const ESTADOS_TIEMPO = ['Soleado', 'Nublado', 'Lluvia moderada', 'Lluvia intensa'] as const;
export const ESTADOS_SEÑALAMIENTO = ['Buen estado', 'Mal estado', 'Suficiente', 'Insuficiente'] as const;
export const ESTADOS_EPP = ['Completo', 'Incompleto', 'Suficiente', 'Insuficiente'] as const;
export const ESTADOS_SUMINISTRO = ['En existencia', 'Sin materiales'] as const;
export const ESTADOS_SUFRIMIENTO = ['Suficiente', 'Insuficiente'] as const;

const fechaSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)');

const stringArraySchema = z.array(z.string()).default([]);

export const crearReporteSchema = z.object({
  actividades_realizadas: z.string().trim().optional(),
  notas_relevantes: z.string().trim().optional(),
  hora_lluvia: z.string().trim().optional(),
  estado_tiempo: z.enum(ESTADOS_TIEMPO).optional(),
  senalamiento_preventivo: z.enum(ESTADOS_SEÑALAMIENTO).optional(),
  equipo_proteccion: z.enum(ESTADOS_EPP).optional(),
  suministro_materiales: z.enum(ESTADOS_SUMINISTRO).optional(),
  estado_personal: z.enum(ESTADOS_SUFRIMIENTO).optional(),
  estado_maquinaria: z.enum(ESTADOS_SUFRIMIENTO).optional(),
  estado_equipo: z.enum(ESTADOS_SUFRIMIENTO).optional(),
  avance_general: z.number(),
  fecha_estimada_conclusion: fechaSchema,
  condicionantes: stringArraySchema,
  problematica: stringArraySchema,
  interferencias: stringArraySchema,
  conceptos_relevantes: stringArraySchema,
  recursos_utilizados: stringArraySchema,
});

export const cambiarEstadoReporteSchema = z.object({
  estado: z.enum(ESTADOS_REPORTE, 'Estado inválido'),
});

export const reporteObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export const reporteParamsSchema = z.object({
  id_obra: z.uuid(),
  id_reporte: z.uuid(),
});

export const fotoParamsSchema = z.object({
  id_obra: z.uuid(),
  id_reporte: z.uuid(),
  id_foto: z.uuid(),
});

export type CrearReporteDto = z.infer<typeof crearReporteSchema>;
export type CambiarEstadoReporteDto = z.infer<typeof cambiarEstadoReporteSchema>;
export type EstadoReporte = (typeof ESTADOS_REPORTE)[number];

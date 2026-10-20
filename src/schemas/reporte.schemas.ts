import { z } from 'zod';

export const ESTADOS_REPORTE = ['Validado', 'Por revisar'] as const;

export const crearReporteSchema = z.object({
  condicionantes: z.string().trim().min(5).max(2000),
  avance_general: z.string().trim().min(5).max(2000),
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

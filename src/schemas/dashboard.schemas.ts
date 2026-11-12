import { z } from 'zod';

export const AGRUPACIONES_HISTORICO = ['mes', 'semana'] as const;

export const dashboardQuerySchema = z.object({
  agrupacion: z.enum(AGRUPACIONES_HISTORICO).default('mes'),
});

export const dashboardObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

const porcentajeSchema = z.number().min(0).max(100);

export const puntoHistoricoSchema = z.object({
  periodo: z.string(),
  etiqueta: z.string(),
  fecha: z.string(),
  avance_fisico: porcentajeSchema,
  avance_financiero: porcentajeSchema,
});

export const recursosFinancierosSchema = z.object({
  pagado: z.number().nonnegative(),
  saldo_por_pagar: z.number().nonnegative(),
  retenciones: z.number().nonnegative(),
});

export const dashboardIndicadoresSchema = z.object({
  avance_fisico_real: porcentajeSchema,
  avance_fisico_programado: porcentajeSchema,
  avance_financiero_real: porcentajeSchema,
  avance_financiero_programado: porcentajeSchema,
  avance_fisico_monetizado: porcentajeSchema,
  avance_financiero_cobrado: porcentajeSchema,
  desfase_alerta: z.boolean(),
  importe_contrato: z.number().nonnegative(),
  importe_ejecutado: z.number().nonnegative(),
  importe_fisico_monetizado: z.number().nonnegative(),
  fecha_corte: z.string(),
  recursos_financieros: recursosFinancierosSchema,
  historico: z.array(puntoHistoricoSchema),
});

export type RecursosFinancieros = z.infer<typeof recursosFinancierosSchema>;
export type AgrupacionHistorico = (typeof AGRUPACIONES_HISTORICO)[number];
export type PuntoHistorico = z.infer<typeof puntoHistoricoSchema>;
export type DashboardIndicadores = z.infer<typeof dashboardIndicadoresSchema>;

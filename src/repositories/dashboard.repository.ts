import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';
import { ESTADO_APROBADA } from './estimacion.repository.js';

export interface ConceptoCatalogoResumen {
  id_concepto: string;
  cantidad: number;
  precio_unitario: number;
  importe_total: number | null;
}

export interface EstimacionAprobadaResumen {
  id_estimacion: string;
  fecha: string | null;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  importe_estimacion_actual: number | null;
  importe_contrato_snapshot: number | null;
  importe_neto_a_recibir: number | null;
  importe_retencion_sfp: number | null;
  importe_retencion_atraso_programa: number | null;
  created_at: string;
}

export interface DetalleAprobadoResumen {
  id_estimacion: string;
  id_concepto: string;
  cantidad_de_esta_estimacion: number | null;
  precio_unitario_snapshot: number | null;
  importe: number | null;
  avance_fisico_monetizado: number | null;
  avance_financiero_cobrado: number | null;
}

function numero(valor: unknown): number {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

export async function listarCatalogoResumen(
  idObra: string,
): Promise<ConceptoCatalogoResumen[]> {
  const { data, error } = await supabaseAdmin
    .from('catalogos')
    .select('id_concepto, cantidad, precio_unitario, importe_total')
    .eq('id_obra', idObra);

  if (error) {
    throw new AppError(500, 'No se pudo obtener el catálogo de conceptos de la obra');
  }

  return (data ?? []).map((row) => ({
    id_concepto: String(row.id_concepto),
    cantidad: numero(row.cantidad),
    precio_unitario: numero(row.precio_unitario),
    importe_total:
      row.importe_total === null || row.importe_total === undefined
        ? null
        : numero(row.importe_total),
  }));
}

export async function listarEstimacionesAprobadas(
  idObra: string,
): Promise<EstimacionAprobadaResumen[]> {
  const { data, error } = await supabaseAdmin
    .from('estimaciones')
    .select(
      'id_estimacion, fecha, periodo_inicio, periodo_fin, importe_estimacion_actual, importe_contrato_snapshot, importe_neto_a_recibir, importe_retencion_sfp, importe_retencion_atraso_programa, created_at',
    )
    .eq('id_obra', idObra)
    .eq('estado', ESTADO_APROBADA)
    .order('fecha', { ascending: true });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las estimaciones aprobadas de la obra');
  }

  return (data ?? []).map((row) => ({
    id_estimacion: String(row.id_estimacion),
    fecha: row.fecha ? String(row.fecha) : null,
    periodo_inicio: row.periodo_inicio ? String(row.periodo_inicio) : null,
    periodo_fin: row.periodo_fin ? String(row.periodo_fin) : null,
    importe_estimacion_actual:
      row.importe_estimacion_actual === null ||
      row.importe_estimacion_actual === undefined
        ? null
        : numero(row.importe_estimacion_actual),
    importe_contrato_snapshot:
      row.importe_contrato_snapshot === null ||
      row.importe_contrato_snapshot === undefined
        ? null
        : numero(row.importe_contrato_snapshot),
    importe_neto_a_recibir:
      row.importe_neto_a_recibir === null ||
      row.importe_neto_a_recibir === undefined
        ? null
        : numero(row.importe_neto_a_recibir),
    importe_retencion_sfp:
      row.importe_retencion_sfp === null ||
      row.importe_retencion_sfp === undefined
        ? null
        : numero(row.importe_retencion_sfp),
    importe_retencion_atraso_programa:
      row.importe_retencion_atraso_programa === null ||
      row.importe_retencion_atraso_programa === undefined
        ? null
        : numero(row.importe_retencion_atraso_programa),
    created_at: String(row.created_at),
  }));
}

export async function listarDetallesEstimacionesAprobadas(
  idsEstimacion: string[],
): Promise<DetalleAprobadoResumen[]> {
  if (idsEstimacion.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('estimacion_conceptos')
    .select(
      'id_estimacion, id_concepto, cantidad_de_esta_estimacion, precio_unitario_snapshot, importe, avance_fisico_monetizado, avance_financiero_cobrado',
    )
    .in('id_estimacion', idsEstimacion);

  if (error) {
    throw new AppError(
      500,
      'No se pudieron obtener los conceptos de las estimaciones aprobadas',
    );
  }

  return (data ?? []).map((row) => ({
    id_estimacion: String(row.id_estimacion),
    id_concepto: String(row.id_concepto),
    cantidad_de_esta_estimacion:
      row.cantidad_de_esta_estimacion === null ||
      row.cantidad_de_esta_estimacion === undefined
        ? null
        : numero(row.cantidad_de_esta_estimacion),
    precio_unitario_snapshot:
      row.precio_unitario_snapshot === null ||
      row.precio_unitario_snapshot === undefined
        ? null
        : numero(row.precio_unitario_snapshot),
    importe:
      row.importe === null || row.importe === undefined
        ? null
        : numero(row.importe),
    avance_fisico_monetizado:
      row.avance_fisico_monetizado === null ||
      row.avance_fisico_monetizado === undefined
        ? null
        : numero(row.avance_fisico_monetizado),
    avance_financiero_cobrado:
      row.avance_financiero_cobrado === null ||
      row.avance_financiero_cobrado === undefined
        ? null
        : numero(row.avance_financiero_cobrado),
  }));
}

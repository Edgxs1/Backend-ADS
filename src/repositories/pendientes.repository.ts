import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export interface EstimacionPendiente {
  id_estimacion: string;
  id_obra: string;
  folio: string;
  tipo: string;
  estado: string;
  fecha: string | null;
  periodo_fin: string | null;
  created_at: string;
}

export interface NotaPendiente {
  id_nota: string;
  id_obra: string;
  id_creador: string | null;
  texto: string;
  estado: string | null;
  created_at: string;
}

export interface ReportePendiente {
  id_reporte: string;
  id_obra: string;
  estado: string;
  actividades_realizadas: string | null;
  created_at: string;
}

export type ColumnaFirmaNota =
  | 'firma_superintendente'
  | 'firma_supervisor'
  | 'firma_residente';

export async function listarEstimacionesPendientes(
  idsObra: string[],
  estados: string[],
): Promise<EstimacionPendiente[]> {
  if (idsObra.length === 0 || estados.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('estimaciones')
    .select(
      'id_estimacion, id_obra, folio, tipo, estado, fecha, periodo_fin, created_at',
    )
    .in('id_obra', idsObra)
    .in('estado', estados)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las estimaciones pendientes');
  }

  return (data ?? []).map((row) => ({
    id_estimacion: String(row.id_estimacion),
    id_obra: String(row.id_obra),
    folio: String(row.folio),
    tipo: String(row.tipo ?? ''),
    estado: String(row.estado ?? ''),
    fecha: row.fecha ? String(row.fecha) : null,
    periodo_fin: row.periodo_fin ? String(row.periodo_fin) : null,
    created_at: String(row.created_at),
  }));
}

export async function listarNotasPendientesFirma(
  idsObra: string[],
  columnaFirma: ColumnaFirmaNota,
  idCreador: string | null,
): Promise<NotaPendiente[]> {
  if (idsObra.length === 0) {
    return [];
  }

  let consulta = supabaseAdmin
    .from('bitacora_notas')
    .select('id_nota, id_obra, id_creador, texto, estado, created_at')
    .in('id_obra', idsObra)
    .is(columnaFirma, null)
    .neq('estado', 'Completada')
    .order('created_at', { ascending: true });

  if (idCreador) {
    consulta = consulta.eq('id_creador', idCreador);
  }

  const { data, error } = await consulta;

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las notas pendientes de firma');
  }

  return (data ?? []).map((row) => ({
    id_nota: String(row.id_nota),
    id_obra: String(row.id_obra),
    id_creador: row.id_creador ? String(row.id_creador) : null,
    texto: String(row.texto ?? ''),
    estado: row.estado ? String(row.estado) : null,
    created_at: String(row.created_at),
  }));
}

export async function listarReportesPendientes(
  idsObra: string[],
  estado: string,
): Promise<ReportePendiente[]> {
  if (idsObra.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('reportes_diarios')
    .select('id_reporte, id_obra, estado, actividades_realizadas, created_at')
    .in('id_obra', idsObra)
    .eq('estado', estado)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener los reportes pendientes');
  }

  return (data ?? []).map((row) => ({
    id_reporte: String(row.id_reporte),
    id_obra: String(row.id_obra),
    estado: String(row.estado ?? ''),
    actividades_realizadas: row.actividades_realizadas
      ? String(row.actividades_realizadas)
      : null,
    created_at: String(row.created_at),
  }));
}

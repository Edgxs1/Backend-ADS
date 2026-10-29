import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export const ESTADO_POR_REVISAR = 'Por revisar';
export const ESTADO_VALIDADO = 'Validado';

export interface Reporte {
  id_reporte: string;
  id_obra: string;
  id_creador: string;
  estado: string;
  created_at: string;
  condicionantes: string[] | null;
  problematica: string[] | null;
  interferencias: string[] | null;
  conceptos_relevantes: string[] | null;
  recursos_utilizados: string[] | null;
  actividades_realizadas: string | null;
  notas_relevantes: string | null;
  estado_tiempo: string | null;
  hora_lluvia: string | null;
  senalamiento_preventivo: string | null;
  equipo_proteccion: string | null;
  suministro_materiales: string | null;
  estado_personal: string | null;
  estado_maquinaria: string | null;
  estado_equipo: string | null;
  avance_general: number | null;
  fecha_estimada_conclusion: string | null;
}

export interface ReporteConCreador extends Reporte {
  creador_correo: string | null;
}

export interface CrearReporteInput {
  id_obra: string;
  id_creador: string;
  actividades_realizadas?: string | null;
  notas_relevantes?: string | null;
  hora_lluvia?: string | null;
  estado_tiempo?: string | null;
  senalamiento_preventivo?: string | null;
  equipo_proteccion?: string | null;
  suministro_materiales?: string | null;
  estado_personal?: string | null;
  estado_maquinaria?: string | null;
  estado_equipo?: string | null;
  avance_general: number;
  fecha_estimada_conclusion: string;
  condicionantes: string[];
  problematica: string[];
  interferencias: string[];
  conceptos_relevantes: string[];
  recursos_utilizados: string[];
}

interface ReporteRow extends Reporte {
  usuarios: { correo: string } | { correo: string }[] | null;
}

function extraerCorreo(
  usuario: { correo: string } | { correo: string }[] | null,
): string | null {
  if (!usuario) {
    return null;
  }

  if (Array.isArray(usuario)) {
    return usuario[0]?.correo ?? null;
  }

  return usuario.correo ?? null;
}

const COLUMNS =
  'id_reporte, id_obra, id_creador, estado, created_at, condicionantes, problematica, interferencias, conceptos_relevantes, recursos_utilizados, actividades_realizadas, notas_relevantes, estado_tiempo, hora_lluvia, senalamiento_preventivo, equipo_proteccion, suministro_materiales, estado_personal, estado_maquinaria, estado_equipo, avance_general, fecha_estimada_conclusion';

export async function crearReporte(input: CrearReporteInput): Promise<Reporte> {
  const { data, error } = await supabaseAdmin
    .from('reportes_diarios')
    .insert({
      id_obra: input.id_obra,
      id_creador: input.id_creador,
      actividades_realizadas: input.actividades_realizadas ?? null,
      notas_relevantes: input.notas_relevantes ?? null,
      hora_lluvia: input.hora_lluvia ?? null,
      estado_tiempo: input.estado_tiempo ?? null,
      senalamiento_preventivo: input.senalamiento_preventivo ?? null,
      equipo_proteccion: input.equipo_proteccion ?? null,
      suministro_materiales: input.suministro_materiales ?? null,
      estado_personal: input.estado_personal ?? null,
      estado_maquinaria: input.estado_maquinaria ?? null,
      estado_equipo: input.estado_equipo ?? null,
      avance_general: input.avance_general,
      fecha_estimada_conclusion: input.fecha_estimada_conclusion,
      condicionantes: input.condicionantes,
      problematica: input.problematica,
      interferencias: input.interferencias,
      conceptos_relevantes: input.conceptos_relevantes,
      recursos_utilizados: input.recursos_utilizados,
      estado: ESTADO_POR_REVISAR,
    })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(400, 'No se pudo crear el reporte');
  }

  return data as Reporte;
}

export async function obtenerReportesPorObra(
  idObra: string,
): Promise<ReporteConCreador[]> {
  const { data, error } = await supabaseAdmin
    .from('reportes_diarios')
    .select(`${COLUMNS}, usuarios (correo)`)
    .eq('id_obra', idObra)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener los reportes de la obra');
  }

  return ((data ?? []) as unknown as ReporteRow[]).map(({ usuarios, ...reporte }) => ({
    ...reporte,
    creador_correo: extraerCorreo(usuarios),
  }));
}

export async function obtenerReportePorId(idReporte: string): Promise<Reporte | null> {
  const { data, error } = await supabaseAdmin
    .from('reportes_diarios')
    .select(COLUMNS)
    .eq('id_reporte', idReporte)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'No se pudo obtener el reporte');
  }

  return (data as Reporte | null) ?? null;
}

export interface ActualizarReporteInput {
  actividades_realizadas?: string | null;
  notas_relevantes?: string | null;
  hora_lluvia?: string | null;
  estado_tiempo?: string | null;
  senalamiento_preventivo?: string | null;
  equipo_proteccion?: string | null;
  suministro_materiales?: string | null;
  estado_personal?: string | null;
  estado_maquinaria?: string | null;
  estado_equipo?: string | null;
  avance_general: number;
  fecha_estimada_conclusion: string;
  condicionantes: string[];
  problematica: string[];
  interferencias: string[];
  conceptos_relevantes: string[];
  recursos_utilizados: string[];
  estado?: string;
}

export async function actualizarReporte(
  idReporte: string,
  input: ActualizarReporteInput,
): Promise<Reporte> {
  const { data, error } = await supabaseAdmin
    .from('reportes_diarios')
    .update({
      actividades_realizadas: input.actividades_realizadas ?? null,
      notas_relevantes: input.notas_relevantes ?? null,
      hora_lluvia: input.hora_lluvia ?? null,
      estado_tiempo: input.estado_tiempo ?? null,
      senalamiento_preventivo: input.senalamiento_preventivo ?? null,
      equipo_proteccion: input.equipo_proteccion ?? null,
      suministro_materiales: input.suministro_materiales ?? null,
      estado_personal: input.estado_personal ?? null,
      estado_maquinaria: input.estado_maquinaria ?? null,
      estado_equipo: input.estado_equipo ?? null,
      avance_general: input.avance_general,
      fecha_estimada_conclusion: input.fecha_estimada_conclusion,
      condicionantes: input.condicionantes,
      problematica: input.problematica,
      interferencias: input.interferencias,
      conceptos_relevantes: input.conceptos_relevantes,
      recursos_utilizados: input.recursos_utilizados,
      ...(input.estado ? { estado: input.estado } : {}),
    })
    .eq('id_reporte', idReporte)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(404, 'No se encontró el reporte para actualizar');
  }

  return data as Reporte;
}

export async function actualizarEstadoReporte(
  idReporte: string,
  estado: string,
): Promise<Reporte> {
  const { data, error } = await supabaseAdmin
    .from('reportes_diarios')
    .update({ estado })
    .eq('id_reporte', idReporte)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(404, 'No se encontró el reporte para actualizar');
  }

  return data as Reporte;
}

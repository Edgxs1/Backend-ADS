import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export const ESTADO_POR_REVISAR = 'Por revisar';
export const ESTADO_VALIDADO = 'Validado';

export interface Reporte {
  id_reporte: string;
  id_obra: string;
  id_creador: string;
  estado: string;
  condicionantes: string;
  avance_general: string;
  created_at: string;
}

export interface ReporteConCreador extends Reporte {
  creador_correo: string | null;
}

export interface CrearReporteInput {
  id_obra: string;
  id_creador: string;
  condicionantes: string;
  avance_general: string;
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
  'id_reporte, id_obra, id_creador, estado, condicionantes, avance_general, created_at';

export async function crearReporte(input: CrearReporteInput): Promise<Reporte> {
  const { data, error } = await supabaseAdmin
    .from('reportes_diarios')
    .insert({
      id_obra: input.id_obra,
      id_creador: input.id_creador,
      condicionantes: input.condicionantes,
      avance_general: input.avance_general,
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

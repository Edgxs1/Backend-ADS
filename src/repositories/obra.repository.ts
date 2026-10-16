import { supabaseAdmin } from '../config/supabase.js';
import { ESTADO_ASIGNACION_ACTIVO } from '../shared/constants/asignaciones.js';
import { AppError } from '../shared/errors/AppError.js';

export interface Obra {
  id_obra: string;
  nombre: string;
  tipo_edificacion: string | null;
  num_habitaciones: number | null;
  activo: boolean;
  created_at: string;
}

export interface CrearObraInput {
  nombre: string;
  tipo_edificacion?: string | undefined;
  num_habitaciones?: number | undefined;
}

const COLUMNS = 'id_obra, nombre, tipo_edificacion, num_habitaciones, activo, created_at';

export async function crearObra(input: CrearObraInput): Promise<Obra> {
  const { data, error } = await supabaseAdmin
    .from('obras')
    .insert({ ...input, activo: true })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(400, 'No se pudo crear la obra');
  }

  return data as Obra;
}

export async function listarObras(): Promise<Obra[]> {
  const { data, error } = await supabaseAdmin
    .from('obras')
    .select(COLUMNS)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las obras');
  }

  return (data ?? []) as Obra[];
}

export async function listarObrasAsignadas(idUsuario: string): Promise<Obra[]> {
  const { data: asignaciones, error: asignacionesError } = await supabaseAdmin
    .from('asignaciones_obra')
    .select('id_obra')
    .eq('id_usuario', idUsuario)
    .eq('estado', ESTADO_ASIGNACION_ACTIVO)
    .is('fecha_fin', null);

  if (asignacionesError) {
    throw new AppError(500, 'No se pudieron obtener las asignaciones del usuario');
  }

  const idsObra = [
    ...new Set((asignaciones ?? []).map((fila) => String(fila.id_obra))),
  ];

  if (idsObra.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('obras')
    .select(COLUMNS)
    .in('id_obra', idsObra)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las obras asignadas');
  }

  return (data ?? []) as Obra[];
}

export async function desactivarObra(idObra: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('obras')
    .update({ activo: false })
    .eq('id_obra', idObra)
    .eq('activo', true)
    .select('id_obra')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'No se pudo eliminar la obra');
  }

  return data !== null;
}

import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export interface RecursoCatalogo {
  id_recurso: string;
  id_obra: string | null;
  tipo: string | null;
  descripcion: string;
  activo: boolean;
}

const COLUMNS = 'id_recurso, id_obra, tipo, descripcion, activo';

export async function listarRecursosActivosPorObra(idObra: string): Promise<RecursoCatalogo[]> {
  const { data, error } = await supabaseAdmin
    .from('catalogo_recursos')
    .select(COLUMNS)
    .eq('id_obra', idObra)
    .eq('activo', true)
    .order('tipo', { ascending: true })
    .order('descripcion', { ascending: true });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener los recursos de la obra');
  }

  return (data ?? []) as RecursoCatalogo[];
}

export async function listarTodosRecursosPorObra(idObra: string): Promise<RecursoCatalogo[]> {
  const { data, error } = await supabaseAdmin
    .from('catalogo_recursos')
    .select(COLUMNS)
    .eq('id_obra', idObra)
    .order('tipo', { ascending: true })
    .order('descripcion', { ascending: true });

  if (error) {
    throw new AppError(500, 'Error al obtener los recursos de la obra');
  }

  return (data ?? []) as RecursoCatalogo[];
}

export async function crearRecurso(
  idObra: string,
  input: { tipo: 'PERSONAL' | 'MAQUINARIA' | 'EQUIPO'; descripcion: string },
): Promise<RecursoCatalogo> {
  const payload = {
    id_obra: idObra,
    tipo: input.tipo,
    descripcion: input.descripcion,
    activo: true,
  };

  const { data, error } = await supabaseAdmin
    .from('catalogo_recursos')
    .insert(payload)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(500, 'No se pudo crear el recurso');
  }

  return data as RecursoCatalogo;
}

export async function actualizarRecurso(
  idRecurso: string,
  input: { descripcion?: string; activo?: boolean },
): Promise<RecursoCatalogo> {
  const payload: Record<string, unknown> = {};

  if (input.descripcion !== undefined) payload.descripcion = input.descripcion;
  if (input.activo !== undefined) payload.activo = input.activo;

  const { data, error } = await supabaseAdmin
    .from('catalogo_recursos')
    .update(payload)
    .eq('id_recurso', idRecurso)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(404, 'No se encontró el recurso para actualizar');
  }

  return data as RecursoCatalogo;
}

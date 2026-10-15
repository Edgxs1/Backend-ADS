import { createSupabaseClient } from '../config/supabase.js';
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

export async function crearObra(input: CrearObraInput, accessToken: string): Promise<Obra> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('obras')
    .insert({ ...input, activo: true })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(400, 'No se pudo crear la obra');
  }

  return data as Obra;
}

export async function listarObras(accessToken: string): Promise<Obra[]> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('obras')
    .select(COLUMNS)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las obras');
  }

  return (data ?? []) as Obra[];
}

export async function desactivarObra(idObra: string, accessToken: string): Promise<boolean> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
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

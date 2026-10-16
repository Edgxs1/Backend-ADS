import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export interface Partida {
  id_partida: string;
  id_obra: string;
  clave: string;
  descripcion: string;
}

export interface CrearPartidaInput {
  clave: string;
  descripcion: string;
}

const COLUMNS = 'id_partida, id_obra, clave, descripcion';

export async function crearPartida(
  idObra: string,
  input: CrearPartidaInput,
): Promise<Partida> {
  const { data, error } = await supabaseAdmin
    .from('partidas')
    .insert({ id_obra: idObra, clave: input.clave, descripcion: input.descripcion })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(400, 'No se pudo crear la partida');
  }

  return data as Partida;
}

export async function obtenerPartidasPorObra(idObra: string): Promise<Partida[]> {
  const { data, error } = await supabaseAdmin
    .from('partidas')
    .select(COLUMNS)
    .eq('id_obra', idObra)
    .order('clave', { ascending: true });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las partidas');
  }

  return (data ?? []) as Partida[];
}

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

export interface ActualizarPartidaInput {
  clave: string;
  descripcion: string;
}

const COLUMNS = 'id_partida, id_obra, clave, descripcion';

export async function crearPartida(
  idObra: string,
  idCreadoPor: string,
  input: CrearPartidaInput,
): Promise<Partida> {
  const { data, error } = await supabaseAdmin
    .from('partidas')
    .insert({
      id_obra: idObra,
      id_creado_por: idCreadoPor,
      clave: input.clave,
      descripcion: input.descripcion,
    })
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

export async function actualizarPartida(
  idObra: string,
  idPartida: string,
  input: ActualizarPartidaInput,
): Promise<Partida> {
  const { data, error } = await supabaseAdmin
    .from('partidas')
    .update({ clave: input.clave, descripcion: input.descripcion })
    .eq('id_obra', idObra)
    .eq('id_partida', idPartida)
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    throw new AppError(400, 'No se pudo actualizar la partida');
  }

  if (!data) {
    throw new AppError(404, 'Partida no encontrada');
  }

  return data as Partida;
}

export async function eliminarPartida(
  idObra: string,
  idPartida: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('partidas')
    .delete()
    .eq('id_obra', idObra)
    .eq('id_partida', idPartida)
    .select('id_partida')
    .maybeSingle();

  if (error) {
    throw new AppError(400, 'No se pudo eliminar la partida');
  }

  if (!data) {
    throw new AppError(404, 'Partida no encontrada');
  }
}

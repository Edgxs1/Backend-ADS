import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export const ESTADO_ABIERTA = 'Abierta';
export const ESTADO_FIRMADA = 'Firmada';

export interface NotaBitacora {
  id_nota: string;
  id_obra: string;
  id_creador: string;
  texto: string;
  estado: string;
  created_at: string;
  firma_superintendente: string | null;
  firma_supervisor: string | null;
  firma_residente: string | null;
}

export interface NotaConCreador extends NotaBitacora {
  creador_correo: string | null;
}

export interface CrearNotaInput {
  id_obra: string;
  id_creador: string;
  texto: string;
}

interface NotaRow extends NotaBitacora {
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
  'id_nota, id_obra, id_creador, texto, estado, created_at, firma_superintendente, firma_supervisor, firma_residente';

export async function crearNota(input: CrearNotaInput): Promise<NotaBitacora> {
  const { data, error } = await supabaseAdmin
    .from('bitacora_notas')
    .insert({
      id_obra: input.id_obra,
      id_creador: input.id_creador,
      texto: input.texto,
      estado: ESTADO_ABIERTA,
      firma_superintendente: null,
      firma_supervisor: null,
      firma_residente: null,
    })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(400, 'No se pudo crear la nota de bitácora');
  }

  return data as NotaBitacora;
}

export async function obtenerNotasPorObra(
  idObra: string,
): Promise<NotaConCreador[]> {
  const { data, error } = await supabaseAdmin
    .from('bitacora_notas')
    .select(`${COLUMNS}, usuarios (correo)`)
    .eq('id_obra', idObra)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las notas de la obra');
  }

  return ((data ?? []) as unknown as NotaRow[]).map(({ usuarios, ...nota }) => ({
    ...nota,
    creador_correo: extraerCorreo(usuarios),
  }));
}

export async function obtenerNotaPorId(
  idNota: string,
): Promise<NotaBitacora | null> {
  const { data, error } = await supabaseAdmin
    .from('bitacora_notas')
    .select(COLUMNS)
    .eq('id_nota', idNota)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'No se pudo obtener la nota de bitácora');
  }

  return (data as NotaBitacora | null) ?? null;
}

export async function actualizarTextoNota(
  idNota: string,
  texto: string,
): Promise<NotaBitacora> {
  const { data, error } = await supabaseAdmin
    .from('bitacora_notas')
    .update({ texto })
    .eq('id_nota', idNota)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(404, 'No se encontró la nota para actualizar');
  }

  return data as NotaBitacora;
}

export async function firmarNotaRepo(
  idNota: string,
  columnaFirma: 'firma_superintendente' | 'firma_supervisor' | 'firma_residente',
  hash: string,
  estado: string,
): Promise<NotaBitacora> {
  const payload: Record<string, string> = {
    [columnaFirma]: hash,
    estado,
  };

  const { data, error } = await supabaseAdmin
    .from('bitacora_notas')
    .update(payload)
    .eq('id_nota', idNota)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(404, 'No se encontró la nota para firmar');
  }

  return data as NotaBitacora;
}

export async function actualizarEstadoNota(
  idNota: string,
  estado: string,
): Promise<NotaBitacora> {
  const { data, error } = await supabaseAdmin
    .from('bitacora_notas')
    .update({ estado })
    .eq('id_nota', idNota)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(404, 'No se encontró la nota para actualizar el estado de la nota');
  }

  return data as NotaBitacora;
}

export async function eliminarNota(idNota: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('bitacora_notas')
    .delete()
    .eq('id_nota', idNota);

  if (error) {
    throw new AppError(500, 'No se pudo eliminar la nota de bitácora');
  }
}

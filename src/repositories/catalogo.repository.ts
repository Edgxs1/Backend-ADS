import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export interface Concepto {
  id_concepto: string;
  id_obra: string;
  id_partida: string;
  tipo: string;
  clave: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  importe_total: number;
}

export interface ConceptoConPartida extends Concepto {
  partida_clave: string | null;
}

export interface CrearConceptoInput {
  id_partida: string;
  tipo: string;
  clave: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
}

export interface ActualizarConceptoInput extends CrearConceptoInput {}

interface CatalogoRow extends Concepto {
  partidas: { clave: string } | { clave: string }[] | null;
}

function extraerPartidaClave(
  partida: { clave: string } | { clave: string }[] | null,
): string | null {
  if (!partida) {
    return null;
  }

  if (Array.isArray(partida)) {
    return partida[0]?.clave ?? null;
  }

  return partida.clave ?? null;
}

const COLUMNS =
  'id_concepto, id_obra, id_partida, tipo, clave, descripcion, unidad_medida, cantidad, precio_unitario, importe_total';

async function validarPartidaDeObra(
  idObra: string,
  idPartida: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('partidas')
    .select('id_partida')
    .eq('id_partida', idPartida)
    .eq('id_obra', idObra)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'No se pudo validar la partida');
  }

  if (!data) {
    throw new AppError(400, 'La partida no pertenece a la obra');
  }
}

export async function crearConcepto(
  idObra: string,
  idCreadoPor: string,
  input: CrearConceptoInput,
): Promise<Concepto> {
  await validarPartidaDeObra(idObra, input.id_partida);

  const importeTotal = Number((input.cantidad * input.precio_unitario).toFixed(2));

  const { data, error } = await supabaseAdmin
    .from('catalogos')
    .insert({
      id_obra: idObra,
      id_creado_por: idCreadoPor,
      id_partida: input.id_partida,
      tipo: input.tipo,
      clave: input.clave,
      descripcion: input.descripcion,
      unidad_medida: input.unidad_medida,
      cantidad: input.cantidad,
      precio_unitario: input.precio_unitario,
      importe_total: importeTotal,
    })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(400, 'No se pudo crear el concepto');
  }

  return data as Concepto;
}

export async function obtenerCatalogosPorObra(idObra: string): Promise<ConceptoConPartida[]> {
  const { data, error } = await supabaseAdmin
    .from('catalogos')
    .select(`${COLUMNS}, partidas (clave)`)
    .eq('id_obra', idObra)
    .order('clave', { ascending: true });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener los conceptos');
  }

  return ((data ?? []) as unknown as CatalogoRow[]).map(({ partidas, ...concepto }) => ({
    ...concepto,
    partida_clave: extraerPartidaClave(partidas),
  }));
}

export async function actualizarConcepto(
  idObra: string,
  idConcepto: string,
  input: ActualizarConceptoInput,
): Promise<Concepto> {
  await validarPartidaDeObra(idObra, input.id_partida);

  const importeTotal = Number((input.cantidad * input.precio_unitario).toFixed(2));

  const { data, error } = await supabaseAdmin
    .from('catalogos')
    .update({
      id_partida: input.id_partida,
      tipo: input.tipo,
      clave: input.clave,
      descripcion: input.descripcion,
      unidad_medida: input.unidad_medida,
      cantidad: input.cantidad,
      precio_unitario: input.precio_unitario,
      importe_total: importeTotal,
    })
    .eq('id_obra', idObra)
    .eq('id_concepto', idConcepto)
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    throw new AppError(400, 'No se pudo actualizar el concepto');
  }

  if (!data) {
    throw new AppError(404, 'Concepto no encontrado');
  }

  return data as Concepto;
}

export async function eliminarConcepto(
  idObra: string,
  idConcepto: string,
): Promise<void> {
  const { count, error: errorUso } = await supabaseAdmin
    .from('estimaciones_detalle')
    .select('id_detalle', { count: 'exact', head: true })
    .eq('id_concepto', idConcepto);

  if (errorUso) {
    throw new AppError(500, 'No se pudo verificar el uso del concepto');
  }

  if ((count ?? 0) > 0) {
    throw new AppError(
      409,
      'No se puede eliminar un concepto que ya tiene estimaciones asociadas',
    );
  }

  const { data, error } = await supabaseAdmin
    .from('catalogos')
    .delete()
    .eq('id_obra', idObra)
    .eq('id_concepto', idConcepto)
    .select('id_concepto')
    .maybeSingle();

  if (error) {
    throw new AppError(400, 'No se pudo eliminar el concepto');
  }

  if (!data) {
    throw new AppError(404, 'Concepto no encontrado');
  }
}

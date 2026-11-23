import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';
import type { CatalogoListadoQueryDto } from '../schemas/catalogo.schemas.js';
import { TIPO_CATALOGO_POR_ESTIMACION } from '../schemas/estimacion.schemas.js';
import { aCentavos, deCentavos } from '../shared/utils/money.js';

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
  cantidad_anterior: number;
  importe_anterior: number;
  saldo_cantidad: number;
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

export type ActualizarConceptoInput = CrearConceptoInput;

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

interface AcumuladoPrevio {
  cantidad: number;
  importe: number;
}

async function obtenerAcumuladosPrevios(
  idObra: string,
  idsConcepto: string[],
  fechaCorte: string,
  excluirIdEstimacion?: string | undefined,
): Promise<Map<string, AcumuladoPrevio>> {
  const vacio = new Map<string, AcumuladoPrevio>();

  if (idsConcepto.length === 0) {
    return vacio;
  }

  let consultaEstimaciones = supabaseAdmin
    .from('estimaciones')
    .select('id_estimacion')
    .eq('id_obra', idObra)
    .or('estado.neq.Rechazada,estado.is.null')
    .lt('fecha', fechaCorte);

  if (excluirIdEstimacion) {
    consultaEstimaciones = consultaEstimaciones.neq(
      'id_estimacion',
      excluirIdEstimacion,
    );
  }

  const { data: estimaciones, error: errorEstimaciones } =
    await consultaEstimaciones;

  if (errorEstimaciones) {
    throw new AppError(500, 'No se pudieron obtener los acumulados previos');
  }

  const idsEstimacion = (estimaciones ?? [])
    .map((estimacion) => estimacion.id_estimacion)
    .filter((id): id is string => Boolean(id));

  if (idsEstimacion.length === 0) {
    return vacio;
  }

  const { data: detalles, error: errorDetalles } = await supabaseAdmin
    .from('estimacion_conceptos')
    .select('id_concepto, cantidad_de_esta_estimacion, importe')
    .in('id_estimacion', idsEstimacion)
    .in('id_concepto', idsConcepto);

  if (errorDetalles) {
    throw new AppError(500, 'No se pudieron obtener los acumulados por concepto');
  }

  const importesPorConcepto = new Map<string, number>();

  for (const detalle of detalles ?? []) {
    const idConcepto = detalle.id_concepto;

    if (!idConcepto) {
      continue;
    }

    const acumulado = vacio.get(idConcepto) ?? { cantidad: 0, importe: 0 };
    acumulado.cantidad += Number(detalle.cantidad_de_esta_estimacion ?? 0);

    const centavos =
      importesPorConcepto.get(idConcepto) ??
      aCentavos(acumulado.importe);

    importesPorConcepto.set(
      idConcepto,
      centavos + aCentavos(detalle.importe),
    );
    acumulado.importe = deCentavos(importesPorConcepto.get(idConcepto) ?? 0);
    vacio.set(idConcepto, acumulado);
  }

  return vacio;
}

export async function obtenerCatalogosPorObra(
  idObra: string,
  opciones?: CatalogoListadoQueryDto,
): Promise<ConceptoConPartida[]> {
  const tipoCatalogo = opciones?.tipo_estimacion
    ? TIPO_CATALOGO_POR_ESTIMACION[opciones.tipo_estimacion]
    : undefined;

  let consulta = supabaseAdmin
    .from('catalogos')
    .select(`${COLUMNS}, partidas (clave)`)
    .eq('id_obra', idObra)
    .order('clave', { ascending: true });

  if (tipoCatalogo) {
    consulta = consulta.eq('tipo', tipoCatalogo);
  }

  const { data, error } = await consulta;

  if (error) {
    throw new AppError(500, 'No se pudieron obtener los conceptos');
  }

  const filas = (data ?? []) as unknown as CatalogoRow[];
  const fechaCorte = opciones?.fecha_corte;
  const acumulados = fechaCorte
    ? await obtenerAcumuladosPrevios(
        idObra,
        filas.map((fila) => fila.id_concepto),
        fechaCorte,
        opciones?.excluir_id_estimacion,
      )
    : new Map<string, AcumuladoPrevio>();

  return filas.map(({ partidas, ...concepto }) => {
    const acumulado = acumulados.get(concepto.id_concepto);
    const cantidadAnterior = acumulado?.cantidad ?? 0;
    const importeAnterior = acumulado?.importe ?? 0;

    return {
      ...concepto,
      partida_clave: extraerPartidaClave(partidas),
      cantidad_anterior: Number(cantidadAnterior.toFixed(2)),
      importe_anterior: importeAnterior,
      saldo_cantidad: Number((concepto.cantidad - cantidadAnterior).toFixed(2)),
    };
  });
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

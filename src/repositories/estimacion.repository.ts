import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';
import { TIPOS_CON_TOPES_25 } from '../schemas/estimacion.schemas.js';
import { aCentavos, aplicarPorcentaje, deCentavos } from '../shared/utils/money.js';
import type { FirmasEstimacion } from '../shared/crypto/firma.js';
import type {
  ConceptoEstimacionDto,
  CrearEstimacionDto,
  EstadoEstimacion,
  TipoEstimacion,
} from '../schemas/estimacion.schemas.js';

export const ESTADO_PRESENTACION = 'Presentación';
export const ESTADO_REVISION = 'Revisión';
export const ESTADO_AUTORIZACION = 'Autorización';
export const ESTADO_APROBADA = 'Aprobada';
export const ESTADO_RECHAZADA = 'Rechazada';
export const ESTADO_ANULADA = 'Anulada';

export const ESTADOS_TERMINALES: readonly EstadoEstimacion[] = [
  ESTADO_APROBADA,
  ESTADO_RECHAZADA,
  ESTADO_ANULADA,
];

const TASA_IVA_ENTERA = 16;
const TASA_RETENCION_INSPECCION_ENTERA = 5;

export interface Estimacion {
  id_estimacion: string;
  id_obra: string;
  id_anticipo: string | null;
  folio: string;
  fecha: string | null;
  tipo: string;
  estado: string;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  importe_estimacion_actual: number | null;
  importe_acumulado_anterior: number | null;
  importe_acumulado_actual: number | null;
  porcentaje_anticipo_aplicado: number | null;
  importe_amortizacion_actual: number | null;
  importe_amortizado_acumulado_anterior: number | null;
  porcentaje_iva_aplicado: number | null;
  importe_iva: number | null;
  porcentaje_retencion_sfp: number | null;
  importe_retencion_sfp: number | null;
  importe_retencion_atraso_programa: number | null;
  importe_neto_a_recibir: number | null;
  firma_superintendente: string | null;
  firma_supervisor: string | null;
  firma_residente: string | null;
  created_at: string;
}

export interface ConceptoEstimado {
  id_detalle: string;
  id_estimacion: string;
  id_concepto: string;
  clave: string | null;
  descripcion: string | null;
  unidad_medida: string | null;
  cantidad_segun_proyecto: number | null;
  cantidad_hasta_estimacion_anterior: number | null;
  cantidad_de_esta_estimacion: number | null;
  cantidad_total_estimado: number | null;
  cantidad_por_ejecutar: number | null;
  precio_unitario_snapshot: number | null;
  importe: number | null;
  avance_fisico_monetizado: number | null;
  avance_financiero_cobrado: number | null;
}

export interface EstimacionDetalle extends Estimacion {
  conceptos: ConceptoEstimado[];
}

export interface CrearEstimacionInput extends CrearEstimacionDto {
  id_obra: string;
}

const COLUMNS =
  'id_estimacion, id_obra, id_anticipo, folio, fecha, tipo, estado, periodo_inicio, periodo_fin, importe_estimacion_actual, importe_acumulado_anterior, importe_acumulado_actual, porcentaje_anticipo_aplicado, importe_amortizacion_actual, importe_amortizado_acumulado_anterior, porcentaje_iva_aplicado, importe_iva, porcentaje_retencion_sfp, importe_retencion_sfp, importe_retencion_atraso_programa, importe_neto_a_recibir, firma_superintendente, firma_supervisor, firma_residente, created_at';

const DETALLE_COLUMNS =
  'id_detalle, id_estimacion, id_concepto, clave, descripcion, unidad_medida, cantidad_segun_proyecto, cantidad_hasta_estimacion_anterior, cantidad_de_esta_estimacion, cantidad_total_estimado, cantidad_por_ejecutar, precio_unitario_snapshot, importe, avance_fisico_monetizado, avance_financiero_cobrado';

/**
 * Genera un folio secuencial por obra con el formato EST-<n>.
 * Se calcula contando las estimaciones existentes de la obra.
 */
async function generarFolio(idObra: string): Promise<string> {
  const { count, error } = await supabaseAdmin
    .from('estimaciones')
    .select('id_estimacion', { count: 'exact', head: true })
    .eq('id_obra', idObra);

  if (error) {
    throw new AppError(500, 'No se pudo generar el folio de la estimación');
  }

  const siguiente = (count ?? 0) + 1;
  return `EST-${String(siguiente).padStart(3, '0')}`;
}

export interface DatosCatalogo {
  precio_unitario: number;
  cantidad: number;
  clave: string | null;
  descripcion: string | null;
  unidad_medida: string | null;
}

/**
 * RF3.12.5 - Regla Crítica de Snapshot.
 * Obtiene los datos vigentes del catálogo que se copiarán a la estimación.
 */
export async function obtenerDatosCatalogo(
  idObra: string,
  idsConcepto: string[],
): Promise<Map<string, DatosCatalogo>> {
  const { data, error } = await supabaseAdmin
    .from('catalogos')
    .select('id_concepto, precio_unitario, cantidad, clave, descripcion, unidad_medida')
    .eq('id_obra', idObra)
    .in('id_concepto', idsConcepto);

  if (error) {
    throw new AppError(500, 'No se pudieron obtener los datos del catálogo');
  }

  const datos = new Map<string, DatosCatalogo>();

  for (const row of data ?? []) {
    datos.set(String(row.id_concepto), {
      precio_unitario: Number(row.precio_unitario),
      cantidad: Number(row.cantidad),
      clave: row.clave === null || row.clave === undefined ? null : String(row.clave),
      descripcion:
        row.descripcion === null || row.descripcion === undefined
          ? null
          : String(row.descripcion),
      unidad_medida:
        row.unidad_medida === null || row.unidad_medida === undefined
          ? null
          : String(row.unidad_medida),
    });
  }

  return datos;
}

/**
 * RF3.12.5 - Regla Crítica de Snapshot.
 * Obtiene el precio_unitario vigente del catálogo para cada concepto de la obra.
 */
export async function obtenerPreciosCatalogo(
  idObra: string,
  idsConcepto: string[],
): Promise<Map<string, number>> {
  const { data, error } = await supabaseAdmin
    .from('catalogos')
    .select('id_concepto, precio_unitario')
    .eq('id_obra', idObra)
    .in('id_concepto', idsConcepto);

  if (error) {
    throw new AppError(500, 'No se pudieron obtener los precios del catálogo');
  }

  const precios = new Map<string, number>();

  for (const row of data ?? []) {
    precios.set(String(row.id_concepto), Number(row.precio_unitario));
  }

  return precios;
}

function calcularMontos(
  conceptos: ConceptoEstimado[],
  input: CrearEstimacionInput,
): Record<string, number> {
  const subtotalCentavos = conceptos.reduce(
    (total, concepto) => total + aCentavos(concepto.importe),
    0,
  );

  const ivaCentavos = aplicarPorcentaje(subtotalCentavos, TASA_IVA_ENTERA);
  const retencionCentavos = Math.round(
    (subtotalCentavos * TASA_RETENCION_INSPECCION_ENTERA) / 1000,
  );
  const amortizacionCentavos = aCentavos(input.amortizacion ?? 0);
  const retencionManualCentavos = aCentavos(input.retencion_manual ?? 0);

  const netoCentavos =
    subtotalCentavos +
    ivaCentavos -
    retencionCentavos -
    amortizacionCentavos -
    retencionManualCentavos;

  return {
    importe_estimacion_actual: deCentavos(subtotalCentavos),
    importe_iva: deCentavos(ivaCentavos),
    porcentaje_iva_aplicado: TASA_IVA_ENTERA / 100,
    importe_retencion_sfp: deCentavos(retencionCentavos),
    porcentaje_retencion_sfp: TASA_RETENCION_INSPECCION_ENTERA / 1000,
    importe_amortizacion_actual: deCentavos(amortizacionCentavos),
    importe_retencion_atraso_programa: deCentavos(retencionManualCentavos),
    importe_neto_a_recibir: deCentavos(netoCentavos),
  };
}

export async function crearEstimacion(
  input: CrearEstimacionInput,
): Promise<EstimacionDetalle> {
  const folio = await generarFolio(input.id_obra);

  const { data: estimacion, error: errorEstimacion } = await supabaseAdmin
    .from('estimaciones')
    .insert({
      id_obra: input.id_obra,
      folio,
      fecha: input.fecha,
      tipo: input.tipo,
      estado: ESTADO_PRESENTACION,
      periodo_inicio: input.periodo_inicio,
      periodo_fin: input.periodo_fin,
    })
    .select(COLUMNS)
    .single();

  if (errorEstimacion || !estimacion) {
    throw new AppError(400, 'No se pudo crear la estimación');
  }

  const cabecera = estimacion as Estimacion;

  try {
    const conceptos = await insertarConceptos(
      cabecera.id_estimacion,
      input.id_obra,
      input.conceptos,
    );

    const montos = calcularMontos(conceptos, input);

    const { data: cabeceraActualizada, error: errorMontos } = await supabaseAdmin
      .from('estimaciones')
      .update(montos)
      .eq('id_estimacion', cabecera.id_estimacion)
      .select(COLUMNS)
      .single();

    if (errorMontos || !cabeceraActualizada) {
      throw new AppError(500, 'No se pudieron guardar los montos de la estimación');
    }

    return { ...(cabeceraActualizada as Estimacion), conceptos };
  } catch (error) {
    await supabaseAdmin
      .from('estimaciones')
      .delete()
      .eq('id_estimacion', cabecera.id_estimacion)
      .then(() => undefined);

    throw error;
  }
}

async function insertarConceptos(
  idEstimacion: string,
  idObra: string,
  conceptos: ConceptoEstimacionDto[],
): Promise<ConceptoEstimado[]> {
  const idsConcepto = conceptos.map((concepto) => concepto.id_concepto);
  const catalogo = await obtenerDatosCatalogo(idObra, idsConcepto);

  const faltantes = idsConcepto.filter((id) => !catalogo.has(id));

  if (faltantes.length > 0) {
    throw new AppError(
      400,
      `Los siguientes conceptos no pertenecen al catálogo de la obra: ${faltantes.join(', ')}`,
    );
  }

  const historicas = await obtenerCantidadesAutorizadasPorConcepto(
    idObra,
    idsConcepto,
  );

  const filas = conceptos.map((concepto) => {
    const datos = catalogo.get(concepto.id_concepto)!;
    const precioSnapshot = datos.precio_unitario;
    const cantidadProyecto = datos.cantidad;
    const cantidadAnterior = historicas.get(concepto.id_concepto) ?? 0;
    const cantidadTotal = cantidadAnterior + concepto.cantidad;
    const importe = Number((concepto.cantidad * precioSnapshot).toFixed(2));

    return {
      id_estimacion: idEstimacion,
      id_concepto: concepto.id_concepto,
      clave: datos.clave,
      descripcion: datos.descripcion,
      unidad_medida: datos.unidad_medida,
      cantidad_segun_proyecto: cantidadProyecto,
      cantidad_hasta_estimacion_anterior: cantidadAnterior,
      cantidad_de_esta_estimacion: concepto.cantidad,
      cantidad_total_estimado: cantidadTotal,
      cantidad_por_ejecutar: Math.max(cantidadProyecto - cantidadTotal, 0),
      precio_unitario_snapshot: precioSnapshot,
      importe,
    };
  });

  const { data, error } = await supabaseAdmin
    .from('estimacion_conceptos')
    .insert(filas)
    .select(DETALLE_COLUMNS);

  if (error) {
    throw new AppError(400, 'No se pudieron registrar los conceptos de la estimación');
  }

  return (data ?? []) as ConceptoEstimado[];
}

export async function obtenerEstimacionesPorObra(
  idObra: string,
): Promise<Estimacion[]> {
  const { data, error } = await supabaseAdmin
    .from('estimaciones')
    .select(COLUMNS)
    .eq('id_obra', idObra)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las estimaciones de la obra');
  }

  return (data ?? []) as Estimacion[];
}

export async function obtenerDetalleEstimacion(
  idEstimacion: string,
): Promise<EstimacionDetalle | null> {
  const { data: estimacion, error } = await supabaseAdmin
    .from('estimaciones')
    .select(COLUMNS)
    .eq('id_estimacion', idEstimacion)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'No se pudo obtener la estimación');
  }

  if (!estimacion) {
    return null;
  }

  const { data: conceptos, error: errorConceptos } = await supabaseAdmin
    .from('estimacion_conceptos')
    .select(DETALLE_COLUMNS)
    .eq('id_estimacion', idEstimacion)
    .order('id_detalle', { ascending: true });

  if (errorConceptos) {
    throw new AppError(500, 'No se pudieron obtener los conceptos de la estimación');
  }

  return {
    ...(estimacion as Estimacion),
    conceptos: (conceptos ?? []) as ConceptoEstimado[],
  };
}

export type { ConceptoEstimacionDto, EstadoEstimacion, TipoEstimacion };

export async function obtenerEstimacionPorId(
  idEstimacion: string,
): Promise<Estimacion | null> {
  const { data, error } = await supabaseAdmin
    .from('estimaciones')
    .select(COLUMNS)
    .eq('id_estimacion', idEstimacion)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'No se pudo obtener la estimación');
  }

  return (data as Estimacion | null) ?? null;
}

export async function actualizarEstadoEstimacion(
  idEstimacion: string,
  estado: string,
): Promise<Estimacion> {
  const { data, error } = await supabaseAdmin
    .from('estimaciones')
    .update({ estado })
    .eq('id_estimacion', idEstimacion)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(404, 'No se encontró la estimación para actualizar');
  }

  return data as Estimacion;
}

/**
 * Autoriza la estimación y persiste las tres firmas criptográficas en una
 * sola sentencia UPDATE (atómica): el estado y las firmas quedan
 * consistente o no se escribe nada.
 */
export async function autorizarEstimacionConFirmas(
  idEstimacion: string,
  firmas: FirmasEstimacion,
): Promise<Estimacion> {
  const { data, error } = await supabaseAdmin
    .from('estimaciones')
    .update({ estado: ESTADO_APROBADA, ...firmas })
    .eq('id_estimacion', idEstimacion)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(404, 'No se encontró la estimación para autorizar');
  }

  return data as Estimacion;
}

export async function eliminarEstimacion(idEstimacion: string): Promise<void> {
  const { error: errorDetalle } = await supabaseAdmin
    .from('estimacion_conceptos')
    .delete()
    .eq('id_estimacion', idEstimacion);

  if (errorDetalle) {
    throw new AppError(500, 'No se pudieron eliminar los conceptos de la estimación');
  }

  const { error } = await supabaseAdmin
    .from('estimaciones')
    .delete()
    .eq('id_estimacion', idEstimacion);

  if (error) {
    throw new AppError(500, 'No se pudo eliminar la estimación');
  }
}

/**
 * RF3.7 - Límite de avance físico.
 * Suma de cantidades históricas de un concepto en estimaciones Autorizadas.
 * Devuelve un mapa id_concepto -> cantidad acumulada autorizada.
 */
export async function obtenerCantidadesAutorizadasPorConcepto(
  idObra: string,
  idsConcepto: string[],
): Promise<Map<string, number>> {
  if (idsConcepto.length === 0) {
    return new Map();
  }

  const { data: estimaciones, error } = await supabaseAdmin
    .from('estimaciones')
    .select('id_estimacion')
    .eq('id_obra', idObra)
    .eq('estado', ESTADO_APROBADA);

  if (error) {
    throw new AppError(500, 'No se pudieron validar las cantidades históricas');
  }

  const idsEstimacion = (estimaciones ?? []).map((row) => String(row.id_estimacion));

  if (idsEstimacion.length === 0) {
    return new Map();
  }

  const { data: detalles, error: errorDetalle } = await supabaseAdmin
    .from('estimacion_conceptos')
    .select('id_concepto, cantidad_de_esta_estimacion')
    .in('id_estimacion', idsEstimacion)
    .in('id_concepto', idsConcepto);

  if (errorDetalle) {
    throw new AppError(500, 'No se pudieron validar las cantidades históricas');
  }

  const acumulado = new Map<string, number>();

  for (const row of detalles ?? []) {
    const idConcepto = String(row.id_concepto);
    const cantidad = Number(row.cantidad_de_esta_estimacion ?? 0);
    acumulado.set(idConcepto, (acumulado.get(idConcepto) ?? 0) + cantidad);
  }

  return acumulado;
}

/**
 * RF3.11 - Regla del 25%.
 * Importe total acumulado de estimaciones Autorizadas de tipo Adicional/Extraordinaria.
 */
export async function obtenerImporteAdicionalAutorizado(
  idObra: string,
): Promise<number> {
  const { data: estimaciones, error } = await supabaseAdmin
    .from('estimaciones')
    .select('id_estimacion')
    .eq('id_obra', idObra)
    .eq('estado', ESTADO_APROBADA)
    .in('tipo', [...TIPOS_CON_TOPES_25]);

  if (error) {
    throw new AppError(500, 'No se pudo validar el importe extraordinario acumulado');
  }

  const idsEstimacion = (estimaciones ?? []).map((row) => String(row.id_estimacion));

  if (idsEstimacion.length === 0) {
    return 0;
  }

  const { data: detalles, error: errorDetalle } = await supabaseAdmin
    .from('estimacion_conceptos')
    .select('importe')
    .in('id_estimacion', idsEstimacion);

  if (errorDetalle) {
    throw new AppError(500, 'No se pudo validar el importe extraordinario acumulado');
  }

  return (detalles ?? []).reduce(
    (total, row) => total + Number(row.importe ?? 0),
    0,
  );
}

/**
 * Cantidades máximas del catálogo para los conceptos indicados de la obra.
 */
export async function obtenerCantidadesCatalogo(
  idObra: string,
  idsConcepto: string[],
): Promise<Map<string, number>> {
  const { data, error } = await supabaseAdmin
    .from('catalogos')
    .select('id_concepto, cantidad')
    .eq('id_obra', idObra)
    .in('id_concepto', idsConcepto);

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las cantidades del catálogo');
  }

  const cantidades = new Map<string, number>();

  for (const row of data ?? []) {
    cantidades.set(String(row.id_concepto), Number(row.cantidad));
  }

  return cantidades;
}
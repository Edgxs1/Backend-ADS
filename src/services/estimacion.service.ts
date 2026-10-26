import {
  crearEstimacion as crearEstimacionRepo,
  actualizarEstadoEstimacion as actualizarEstadoRepo,
  autorizarEstimacionConFirmas as autorizarConFirmasRepo,
  obtenerCantidadesAutorizadasPorConcepto,
  obtenerCantidadesCatalogo,
  obtenerDetalleEstimacion as obtenerDetalleRepo,
  obtenerEstimacionPorId,
  obtenerEstimacionesPorObra as obtenerEstimacionesRepo,
  obtenerImporteAdicionalAutorizado,
  obtenerPreciosCatalogo,
  eliminarEstimacion as eliminarEstimacionRepo,
} from '../repositories/estimacion.repository.js';
import type {
  CrearEstimacionInput,
  Estimacion,
  EstimacionDetalle,
} from '../repositories/estimacion.repository.js';
import { obtenerContratoPorObra } from '../repositories/contrato.repository.js';
import { AppError } from '../shared/errors/AppError.js';
import { generarPaqueteFirmas } from '../shared/crypto/firma.js';
import { aCentavos, aplicarPorcentaje, deCentavos } from '../shared/utils/money.js';
import {
  TIPOS_CON_TOPES_25,
} from '../schemas/estimacion.schemas.js';
import type {
  ConceptoEstimacionDto,
  EstadoEstimacion,
  TipoEstimacion,
} from '../schemas/estimacion.schemas.js';

const ESTADO_BORRADOR: EstadoEstimacion = 'Borrador';
const ESTADO_REVISION_SUPERVISOR: EstadoEstimacion = 'Revision Supervisor';
const ESTADO_REVISION_RESIDENTE: EstadoEstimacion = 'Revision Residente';
const ESTADO_AUTORIZADA: EstadoEstimacion = 'Autorizada';
const ESTADO_RECHAZADA: EstadoEstimacion = 'Rechazada';

const PORCENTAJE_TOPE_ADICIONAL = 0.25;

/** Tasas del motor financiero (expresadas como enteros para evitar float drift). */
const TASA_IVA_ENTERA = 16;
const TASA_RETENCION_INSPECCION_ENTERA = 5; // 0.5% -> 5/1000

/**
 * Motor Financiero de Carátula.
 *
 * Calcula al vuelo los importes de la estimación con precisión exacta
 * (aritmética entera en centavos, 2 decimales al devolver).
 *
 * Subtotal  = SUM(importe) de los conceptos
 * IVA       = 16% del Subtotal
 * Ret. Insp = 0.5% del Subtotal
 * Neto      = (Subtotal + IVA) - (Ret. Insp + Amortización + Atraso)
 */
export interface CaratulaFinanciera {
  subtotal: number;
  iva: number;
  retencion_inspeccion: number;
  amortizacion_anticipo: number;
  retencion_atraso_programa: number;
  neto_a_recibir: number;
}

export async function generarCaratulaFinanciera(
  idEstimacion: string,
): Promise<CaratulaFinanciera> {
  const detalle = await obtenerDetalleRepo(idEstimacion);

  if (!detalle) {
    throw new AppError(404, 'Estimación no encontrada');
  }

  const subtotalCentavos = detalle.conceptos.reduce(
    (total, concepto) => total + aCentavos(concepto.importe),
    0,
  );

  const ivaCentavos = aplicarPorcentaje(subtotalCentavos, TASA_IVA_ENTERA);
  const retencionInspeccionCentavos = Math.round(
    (subtotalCentavos * TASA_RETENCION_INSPECCION_ENTERA) / 1000,
  );

  const amortizacionCentavos = aCentavos(detalle.importe_amortizacion_actual);
  const atrasoCentavos = aCentavos(detalle.importe_retencion_atraso_programa);

  const netoCentavos =
    subtotalCentavos +
    ivaCentavos -
    (retencionInspeccionCentavos + amortizacionCentavos + atrasoCentavos);

  return {
    subtotal: deCentavos(subtotalCentavos),
    iva: deCentavos(ivaCentavos),
    retencion_inspeccion: deCentavos(retencionInspeccionCentavos),
    amortizacion_anticipo: deCentavos(amortizacionCentavos),
    retencion_atraso_programa: deCentavos(atrasoCentavos),
    neto_a_recibir: deCentavos(netoCentavos),
  };
}

export interface RegistrarEstimacionInput {
  tipo: TipoEstimacion;
  fecha: string;
  periodo_inicio: string;
  periodo_fin: string;
  conceptos: ConceptoEstimacionDto[];
}

/**
 * RF3.7 - Límite de avance físico.
 * Verifica que la cantidad de esta estimación más lo histórico autorizado
 * no exceda la cantidad máxima del catálogo para cada concepto.
 */
async function validarLimiteAvanceFisico(
  idObra: string,
  conceptos: ConceptoEstimacionDto[],
): Promise<void> {
  const idsConcepto = conceptos.map((concepto) => concepto.id_concepto);

  const [cantidadesCatalogo, historicas] = await Promise.all([
    obtenerCantidadesCatalogo(idObra, idsConcepto),
    obtenerCantidadesAutorizadasPorConcepto(idObra, idsConcepto),
  ]);

  const excedidos: string[] = [];

  for (const concepto of conceptos) {
    const maximo = cantidadesCatalogo.get(concepto.id_concepto);

    if (maximo === undefined) {
      continue;
    }

    const acumulado = (historicas.get(concepto.id_concepto) ?? 0) + concepto.cantidad;

    if (acumulado > maximo) {
      excedidos.push(
        `${concepto.id_concepto} (solicitado + histórico = ${acumulado}, máximo = ${maximo})`,
      );
    }
  }

  if (excedidos.length > 0) {
    throw new AppError(
      400,
      `RF3.7 - Límite de avance físico excedido en: ${excedidos.join('; ')}`,
    );
  }
}

/**
 * RF3.11 - Regla del 25%.
 * Las estimaciones Adicionales/Extraordinarias no pueden exceder el 25%
 * del monto original del contrato (considerando las ya autorizadas).
 */
async function validarRegla25(
  idObra: string,
  tipo: TipoEstimacion,
  importeNuevo: number,
): Promise<void> {
  if (!(TIPOS_CON_TOPES_25 as readonly string[]).includes(tipo)) {
    return;
  }

  const contrato = await obtenerContratoPorObra(idObra);

  if (!contrato) {
    throw new AppError(
      400,
      'No existe un contrato registrado para validar el tope del 25%',
    );
  }

  const tope = Number(contrato.importe_contrato) * PORCENTAJE_TOPE_ADICIONAL;
  const acumulado = await obtenerImporteAdicionalAutorizado(idObra);
  const total = acumulado + importeNuevo;

  if (total > tope) {
    throw new AppError(
      400,
      `RF3.11 - Regla del 25% excedida: acumulado + nueva = ${total.toFixed(
        2,
      )} supera el tope de ${tope.toFixed(2)}`,
    );
  }
}

export async function registrarEstimacion(
  idObra: string,
  input: RegistrarEstimacionInput,
): Promise<EstimacionDetalle> {
  await validarLimiteAvanceFisico(idObra, input.conceptos);

  const importeNuevo = await calcularImporteEstimacion(idObra, input.conceptos);
  await validarRegla25(idObra, input.tipo, importeNuevo);

  const payload: CrearEstimacionInput = {
    id_obra: idObra,
    tipo: input.tipo,
    fecha: input.fecha,
    periodo_inicio: input.periodo_inicio,
    periodo_fin: input.periodo_fin,
    conceptos: input.conceptos,
  };

  return crearEstimacionRepo(payload);
}

/**
 * Calcula el importe de la estimación usando el precio vigente del catálogo.
 * (El snapshot persistido coincide con este cálculo.)
 */
async function calcularImporteEstimacion(
  idObra: string,
  conceptos: ConceptoEstimacionDto[],
): Promise<number> {
  const idsConcepto = conceptos.map((concepto) => concepto.id_concepto);
  const precios = await obtenerPreciosCatalogo(idObra, idsConcepto);

  return Number(
    conceptos
      .reduce(
        (total, concepto) =>
          total + concepto.cantidad * (precios.get(concepto.id_concepto) ?? 0),
        0,
      )
      .toFixed(2),
  );
}

export async function listarEstimacionesPorObra(
  idObra: string,
): Promise<Estimacion[]> {
  return obtenerEstimacionesRepo(idObra);
}

export async function obtenerDetalleEstimacion(
  idObra: string,
  idEstimacion: string,
): Promise<EstimacionDetalle> {
  const detalle = await obtenerDetalleRepo(idEstimacion);

  if (!detalle || detalle.id_obra !== idObra) {
    throw new AppError(404, 'Estimación no encontrada en esta obra');
  }

  return detalle;
}

export interface CaratulaOficial {
  estimacion: Estimacion;
  conceptos: EstimacionDetalle['conceptos'];
  caratula: CaratulaFinanciera;
}

/**
 * Carátula oficial: cabecera + detalle de conceptos + motor financiero.
 */
export async function obtenerCaratulaOficial(
  idObra: string,
  idEstimacion: string,
): Promise<CaratulaOficial> {
  const detalle = await obtenerDetalleRepo(idEstimacion);

  if (!detalle || detalle.id_obra !== idObra) {
    throw new AppError(404, 'Estimación no encontrada en esta obra');
  }

  const caratula = await generarCaratulaFinanciera(idEstimacion);

  const { conceptos, ...cabecera } = detalle;

  return { estimacion: cabecera, conceptos, caratula };
}

interface EstadosPermitidos {
  desde: EstadoEstimacion;
  hacia: EstadoEstimacion;
  requiereTipoOrdinario?: boolean;
}

async function transitarEstado(
  idObra: string,
  idEstimacion: string,
  regla: EstadosPermitidos,
): Promise<Estimacion> {
  const estimacion = await obtenerEstimacionPorId(idEstimacion);

  if (!estimacion || estimacion.id_obra !== idObra) {
    throw new AppError(404, 'Estimación no encontrada en esta obra');
  }

  if (estimacion.estado !== regla.desde) {
    throw new AppError(
      409,
      `Transición inválida: se esperaba estado "${regla.desde}" pero la estimación está en "${estimacion.estado}"`,
    );
  }

  return actualizarEstadoRepo(idEstimacion, regla.hacia);
}

export async function enviarEstimacion(
  idObra: string,
  idEstimacion: string,
): Promise<Estimacion> {
  return transitarEstado(idObra, idEstimacion, {
    desde: ESTADO_BORRADOR,
    hacia: ESTADO_REVISION_SUPERVISOR,
  });
}

export async function enviarAResidente(
  idObra: string,
  idEstimacion: string,
): Promise<Estimacion> {
  return transitarEstado(idObra, idEstimacion, {
    desde: ESTADO_REVISION_SUPERVISOR,
    hacia: ESTADO_REVISION_RESIDENTE,
  });
}

export async function autorizarEstimacion(
  idObra: string,
  idEstimacion: string,
): Promise<Estimacion> {
  const estimacion = await obtenerEstimacionPorId(idEstimacion);

  if (!estimacion || estimacion.id_obra !== idObra) {
    throw new AppError(404, 'Estimación no encontrada en esta obra');
  }

  if (estimacion.estado !== ESTADO_REVISION_RESIDENTE) {
    throw new AppError(
      409,
      `Transición inválida: se esperaba estado "${ESTADO_REVISION_RESIDENTE}" pero la estimación está en "${estimacion.estado}"`,
    );
  }

  // RF3.12.3 / RF3.12.7 - Firmas criptográficas SHA-256 generadas al autorizar.
  const firmas = generarPaqueteFirmas({
    folio: estimacion.folio,
    idEstimacion: estimacion.id_estimacion,
  });

  // Estado + firmas se escriben en una sola sentencia UPDATE (atómica).
  return autorizarConFirmasRepo(idEstimacion, firmas);
}

export async function rechazarEstimacion(
  idObra: string,
  idEstimacion: string,
): Promise<Estimacion> {
  return transitarEstado(idObra, idEstimacion, {
    desde: ESTADO_REVISION_RESIDENTE,
    hacia: ESTADO_RECHAZADA,
  });
}

/**
 * RF3.9 - Corrección excepcional de estatus (solo Administrador).
 * Salta el flujo normal para corregir errores.
 */
export async function corregirEstatusEstimacion(
  idObra: string,
  idEstimacion: string,
  estado: EstadoEstimacion,
): Promise<Estimacion> {
  const estimacion = await obtenerEstimacionPorId(idEstimacion);

  if (!estimacion || estimacion.id_obra !== idObra) {
    throw new AppError(404, 'Estimación no encontrada en esta obra');
  }

  return actualizarEstadoRepo(idEstimacion, estado);
}

/**
 * RF3.8 - Candado legal: una estimación Autorizada es inmutable
 * para roles operativos.
 */
export async function asegurarEstimacionNoAutorizada(
  idObra: string,
  idEstimacion: string,
): Promise<void> {
  const estimacion = await obtenerEstimacionPorId(idEstimacion);

  if (!estimacion || estimacion.id_obra !== idObra) {
    throw new AppError(404, 'Estimación no encontrada en esta obra');
  }

  if (estimacion.estado === ESTADO_AUTORIZADA) {
    throw new AppError(
      403,
      'RF3.8 - Una estimación Autorizada es inmutable y no puede modificarse',
    );
  }
}

/**
 * Elimina una estimación. Bloqueada si está Autorizada (RF3.8).
 */
export async function eliminarEstimacion(
  idObra: string,
  idEstimacion: string,
): Promise<void> {
  await asegurarEstimacionNoAutorizada(idObra, idEstimacion);
  await eliminarEstimacionRepo(idEstimacion);
}

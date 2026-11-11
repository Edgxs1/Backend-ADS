import {
  ESTADO_APROBADA,
  ESTADO_CREADA,
  ESTADO_DEVUELTA,
  ESTADO_POR_REVISAR,
  ESTADO_REVISADA,
  crearEstimacion as crearEstimacionRepo,
  actualizarEstimacion as actualizarEstimacionRepo,
  actualizarEstadoEstimacion as actualizarEstadoRepo,
  autorizarEstimacionConFirmas as autorizarConFirmasRepo,
  calcularAcumuladosAnteriores,
  obtenerCantidadesCatalogo,
  obtenerDatosCatalogo,
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
import { findAsignacionActiva } from '../repositories/asignaciones.repository.js';
import { obtenerContratoPorObra } from '../repositories/contrato.repository.js';
import { findUsuarioPorId } from '../repositories/usuarios.repository.js';
import { createAnonClient } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';
import { generarPaqueteFirmas } from '../shared/crypto/firma.js';
import { aCentavos, aplicarPorcentaje, deCentavos } from '../shared/utils/money.js';
import { ROL_BY_ID } from '../shared/types/roles.js';
import type { Rol } from '../shared/types/roles.js';
import { TIPOS_CON_TOPES_25 } from '../schemas/estimacion.schemas.js';
import type {
  ActualizarEstimacionDto,
  ConceptoEstimacionDto,
  EstadoEstimacion,
  MetadataCaratulaDto,
  TipoEstimacion,
} from '../schemas/estimacion.schemas.js';

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
 * Base IVA  = Subtotal - Amortización del anticipo
 * IVA       = 16% de la Base IVA
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

  const amortizacionCentavos = aCentavos(detalle.importe_amortizacion_actual);
  const baseIvaCentavos = Math.max(0, subtotalCentavos - amortizacionCentavos);
  const ivaCentavos = aplicarPorcentaje(baseIvaCentavos, TASA_IVA_ENTERA);
  const retencionInspeccionCentavos = Math.round(
    (subtotalCentavos * TASA_RETENCION_INSPECCION_ENTERA) / 1000,
  );
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
  metadata_caratula?: MetadataCaratulaDto | undefined;
  conceptos: ConceptoEstimacionDto[];
  amortizacion?: number | undefined;
  retencion_manual?: number | undefined;
}

/**
 * RF3.6 / RF3.7 - Límite físico y financiero por concepto.
 *
 * El avance cobrado y el avance físico monetizado nunca pueden superar el
 * importe del concepto en esta estimación:
 *   cantidad_de_esta_estimacion * precio_unitario_snapshot
 */
async function validarAvanceFisicoReportado(
  idObra: string,
  conceptos: ConceptoEstimacionDto[],
): Promise<void> {
  const idsConcepto = conceptos.map((concepto) => concepto.id_concepto);
  const catalogo = await obtenerDatosCatalogo(idObra, idsConcepto);

  const excedidos: string[] = [];

  for (const concepto of conceptos) {
    const datos = catalogo.get(concepto.id_concepto);

    if (!datos) {
      continue;
    }

    const precio = concepto.precio_unitario_snapshot ?? datos.precio_unitario;
    const importeCentavos = aCentavos(
      Number((concepto.cantidad * precio).toFixed(2)),
    );
    const avanceFinancieroCentavos = aCentavos(
      concepto.avance_financiero_cobrado,
    );

    if (avanceFinancieroCentavos > importeCentavos) {
      excedidos.push(
        `${concepto.id_concepto} (avance financiero cobrado = ${concepto.avance_financiero_cobrado}, importe máximo = ${deCentavos(
          importeCentavos,
        )})`,
      );
      continue;
    }

    const avanceFisicoCentavos = aCentavos(concepto.avance_fisico_monetizado);

    if (avanceFisicoCentavos > importeCentavos) {
      excedidos.push(
        `${concepto.id_concepto} (avance físico monetizado = ${concepto.avance_fisico_monetizado}, importe máximo = ${deCentavos(
          importeCentavos,
        )})`,
      );
    }
  }

  if (excedidos.length > 0) {
    throw new AppError(
      400,
      `RF3.6/RF3.7 - Límite de avance excedido en: ${excedidos.join('; ')}`,
    );
  }
}

/**
 * RF3.7 - Límite de avance físico.
 * Verifica que la cantidad de esta estimación más lo histórico aprobado
 * no exceda la cantidad máxima del catálogo para cada concepto.
 */
async function validarLimiteAvanceFisico(
  idObra: string,
  conceptos: ConceptoEstimacionDto[],
  fechaCorte: string,
  excluirIdEstimacion?: string,
): Promise<void> {
  const idsConcepto = conceptos.map((concepto) => concepto.id_concepto);

  const [cantidadesCatalogo, acumulados] = await Promise.all([
    obtenerCantidadesCatalogo(idObra, idsConcepto),
    calcularAcumuladosAnteriores(idObra, fechaCorte, excluirIdEstimacion),
  ]);

  const historicas = acumulados.cantidades_hasta_estimacion_anterior;

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
 * del monto original del contrato (considerando las ya aprobadas).
 */
async function validarRegla25(
  idObra: string,
  tipo: TipoEstimacion,
  importeNuevo: number,
  importeContratoSnapshot?: number | null,
): Promise<void> {
  if (!(TIPOS_CON_TOPES_25 as readonly string[]).includes(tipo)) {
    return;
  }

  let importeContrato = importeContratoSnapshot ?? null;

  if (importeContrato === null) {
    const contrato = await obtenerContratoPorObra(idObra);
    importeContrato = contrato ? Number(contrato.importe_contrato) : null;
  }

  if (importeContrato === null || !Number.isFinite(importeContrato)) {
    throw new AppError(
      400,
      'No existe un contrato registrado para validar el tope del 25%',
    );
  }

  const tope = importeContrato * PORCENTAJE_TOPE_ADICIONAL;
  const acumulado = await obtenerImporteAdicionalAutorizado(idObra);
  const total = acumulado + importeNuevo;

  if (aCentavos(total) > aCentavos(tope)) {
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
  await validarAvanceFisicoReportado(idObra, input.conceptos);
  await validarLimiteAvanceFisico(idObra, input.conceptos, input.fecha);

  const contrato = await obtenerContratoPorObra(idObra);
  const importeContratoSnapshot = contrato
    ? Number(contrato.importe_contrato)
    : null;

  const importeNuevo = await calcularImporteEstimacion(idObra, input.conceptos);
  await validarRegla25(
    idObra,
    input.tipo,
    importeNuevo,
    importeContratoSnapshot,
  );

  const payload: CrearEstimacionInput = {
    id_obra: idObra,
    tipo: input.tipo,
    fecha: input.fecha,
    periodo_inicio: input.periodo_inicio,
    periodo_fin: input.periodo_fin,
    metadata_caratula: input.metadata_caratula,
    conceptos: input.conceptos,
    amortizacion: input.amortizacion,
    retencion_manual: input.retencion_manual,
    importe_contrato_snapshot: importeContratoSnapshot,
  };

  return crearEstimacionRepo(payload);
}

/**
 * Calcula el importe de la estimación usando el precio snapshot enviado por
 * el cliente o, en su defecto, el precio vigente del catálogo.
 */
async function calcularImporteEstimacion(
  idObra: string,
  conceptos: ConceptoEstimacionDto[],
): Promise<number> {
  const idsConcepto = conceptos.map((concepto) => concepto.id_concepto);
  const precios = await obtenerPreciosCatalogo(idObra, idsConcepto);

  return Number(
    conceptos
      .reduce((total, concepto) => {
        const precio =
          concepto.precio_unitario_snapshot ??
          precios.get(concepto.id_concepto) ??
          0;

        return total + concepto.cantidad * precio;
      }, 0)
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

function esEstimacionEditable(estado: string): boolean {
  return estado === ESTADO_CREADA || estado === ESTADO_DEVUELTA;
}

/**
 * RF3.8 - Inmutabilidad.
 *
 * Solo las estimaciones en estado "Creada" o "Devuelta" pueden editarse.
 * Una estimación "Aprobada" (y cualquier estado en revisión) queda bloqueada.
 * El folio se conserva porque el UPDATE nunca lo incluye.
 */
export async function actualizarEstimacion(
  idObra: string,
  idEstimacion: string,
  input: ActualizarEstimacionDto,
): Promise<EstimacionDetalle> {
  const estimacion = await obtenerEstimacionPorId(idEstimacion);

  if (!estimacion || estimacion.id_obra !== idObra) {
    throw new AppError(404, 'Estimación no encontrada en esta obra');
  }

  if (estimacion.estado === ESTADO_APROBADA) {
    throw new AppError(
      409,
      'RF3.8 - Una estimación aprobada es inmutable y no puede editarse',
    );
  }

  if (!esEstimacionEditable(estimacion.estado)) {
    throw new AppError(
      409,
      `RF3.8 - Solo se pueden editar estimaciones en estado "${ESTADO_CREADA}" o "${ESTADO_DEVUELTA}"`,
    );
  }

  await validarAvanceFisicoReportado(idObra, input.conceptos);
  await validarLimiteAvanceFisico(
    idObra,
    input.conceptos,
    input.fecha,
    idEstimacion,
  );

  const contrato = await obtenerContratoPorObra(idObra);
  const importeContratoSnapshot =
    estimacion.importe_contrato_snapshot ??
    (contrato ? Number(contrato.importe_contrato) : null);

  const importeNuevo = await calcularImporteEstimacion(idObra, input.conceptos);
  await validarRegla25(
    idObra,
    input.tipo,
    importeNuevo,
    importeContratoSnapshot,
  );

  const metadataCaratula =
    input.metadata_caratula ??
    estimacion.metadata_caratula ??
    ({} as MetadataCaratulaDto);

  const payload: CrearEstimacionInput = {
    id_obra: idObra,
    tipo: input.tipo,
    fecha: input.fecha,
    periodo_inicio: input.periodo_inicio,
    periodo_fin: input.periodo_fin,
    metadata_caratula: metadataCaratula,
    conceptos: input.conceptos,
    amortizacion: input.amortizacion,
    retencion_manual: input.retencion_manual,
    importe_contrato_snapshot: importeContratoSnapshot,
  };

  return actualizarEstimacionRepo(idEstimacion, payload);
}

export async function actualizarEstimacionPorId(
  idEstimacion: string,
  input: ActualizarEstimacionDto,
): Promise<EstimacionDetalle> {
  const estimacion = await obtenerEstimacionPorId(idEstimacion);

  if (!estimacion) {
    throw new AppError(404, 'Estimación no encontrada');
  }

  return actualizarEstimacion(estimacion.id_obra, idEstimacion, input);
}

const TRANSICIONES_PERMITIDAS: Record<EstadoEstimacion, EstadoEstimacion[]> = {
  [ESTADO_CREADA]: [ESTADO_POR_REVISAR],
  [ESTADO_POR_REVISAR]: [ESTADO_REVISADA, ESTADO_DEVUELTA],
  [ESTADO_REVISADA]: [ESTADO_APROBADA, ESTADO_DEVUELTA],
  [ESTADO_DEVUELTA]: [ESTADO_POR_REVISAR],
  [ESTADO_APROBADA]: [],
};

async function obtenerRolUsuario(idUsuario: string): Promise<Rol> {
  const usuario = await findUsuarioPorId(idUsuario);
  const rol = usuario ? ROL_BY_ID[usuario.id_rol] : undefined;

  if (!rol) {
    throw new AppError(403, 'Acceso denegado: no se pudo determinar tu rol');
  }

  return rol;
}

function validarRolTransicion(
  rol: Rol,
  desde: EstadoEstimacion,
  hacia: EstadoEstimacion,
): void {
  if (rol === 'Administrador') {
    return;
  }

  if (rol === 'Superintendente') {
    const puedeEnviar =
      (desde === ESTADO_CREADA && hacia === ESTADO_POR_REVISAR) ||
      (desde === ESTADO_DEVUELTA && hacia === ESTADO_POR_REVISAR);

    if (puedeEnviar) {
      return;
    }

    throw new AppError(
      403,
      'Acceso denegado: el Superintendente solo puede enviar estimaciones a revisión',
    );
  }

  if (rol === 'Supervisor') {
    const puedeRevisar =
      desde === ESTADO_POR_REVISAR &&
      (hacia === ESTADO_REVISADA || hacia === ESTADO_DEVUELTA);

    if (puedeRevisar) {
      return;
    }

    throw new AppError(
      403,
      'Acceso denegado: el Supervisor solo puede revisar o devolver la estimación',
    );
  }

  if (rol === 'Residente') {
    const puedeAutorizar =
      desde === ESTADO_REVISADA &&
      (hacia === ESTADO_APROBADA || hacia === ESTADO_DEVUELTA);

    if (puedeAutorizar) {
      return;
    }

    throw new AppError(
      403,
      'Acceso denegado: el Residente solo puede aprobar o devolver la estimación',
    );
  }

  throw new AppError(
    403,
    'Acceso denegado: tu rol no puede cambiar el estado de una estimación',
  );
}

async function validarAccesoObra(
  idUsuario: string,
  rol: Rol,
  idObra: string,
): Promise<void> {
  if (rol === 'Administrador') {
    return;
  }

  const asignacion = await findAsignacionActiva(idUsuario, idObra);

  if (!asignacion) {
    throw new AppError(403, 'Acceso denegado: no estás asignado a esta obra');
  }
}

async function verificarPasswordUsuario(
  idUsuario: string,
  password: string,
): Promise<void> {
  const usuario = await findUsuarioPorId(idUsuario);

  if (!usuario) {
    throw new AppError(401, 'No autorizado: usuario no encontrado');
  }

  const authClient = createAnonClient();
  const { error } = await authClient.auth.signInWithPassword({
    email: usuario.correo,
    password,
  });

  if (error) {
    throw new AppError(401, 'Contraseña incorrecta');
  }
}

/**
 * RF3.2 / RF3.3 / RF3.9 - Transición de estado con reglas estrictas por rol.
 * - Superintendente: Creada/Devuelta -> Por revisar.
 * - Supervisor: Por revisar -> Revisada o Devuelta.
 * - Residente: Revisada -> Aprobada (con contraseña) o Devuelta.
 * - Administrador: cambio libre de estatus (RF3.9), sin alterar montos.
 * Al aprobar se generan y persisten las tres firmas hash (RF3.12.7).
 */
export async function cambiarEstadoEstimacion(
  idObra: string,
  idEstimacion: string,
  nuevoEstado: EstadoEstimacion,
  idUsuario: string,
  password?: string,
): Promise<Estimacion> {
  const rol = await obtenerRolUsuario(idUsuario);
  await validarAccesoObra(idUsuario, rol, idObra);

  const estimacion = await obtenerEstimacionPorId(idEstimacion);

  if (!estimacion || estimacion.id_obra !== idObra) {
    throw new AppError(404, 'Estimación no encontrada en esta obra');
  }

  if (estimacion.estado === nuevoEstado) {
    throw new AppError(
      409,
      `La estimación ya se encuentra en estado "${nuevoEstado}"`,
    );
  }

  if (rol !== 'Administrador') {
    const permitidas =
      TRANSICIONES_PERMITIDAS[estimacion.estado as EstadoEstimacion] ?? [];

    if (!permitidas.includes(nuevoEstado)) {
      throw new AppError(
        409,
        `Transición inválida: no se puede pasar de "${estimacion.estado}" a "${nuevoEstado}"`,
      );
    }
  }

  validarRolTransicion(rol, estimacion.estado as EstadoEstimacion, nuevoEstado);

  if (nuevoEstado === ESTADO_APROBADA) {
    if (rol === 'Residente') {
      if (!password) {
        throw new AppError(
          400,
          'La contraseña es obligatoria para aprobar y firmar la estimación',
        );
      }

      await verificarPasswordUsuario(idUsuario, password);
    }

    const firmas = generarPaqueteFirmas({
      folio: estimacion.folio,
      idEstimacion: estimacion.id_estimacion,
    });

    return autorizarConFirmasRepo(idEstimacion, firmas);
  }

  return actualizarEstadoRepo(idEstimacion, nuevoEstado);
}

export async function cambiarEstadoEstimacionPorId(
  idEstimacion: string,
  nuevoEstado: EstadoEstimacion,
  idUsuario: string,
  password?: string,
): Promise<Estimacion> {
  const estimacion = await obtenerEstimacionPorId(idEstimacion);

  if (!estimacion) {
    throw new AppError(404, 'Estimación no encontrada');
  }

  return cambiarEstadoEstimacion(
    estimacion.id_obra,
    idEstimacion,
    nuevoEstado,
    idUsuario,
    password,
  );
}

export async function enviarEstimacion(
  idObra: string,
  idEstimacion: string,
  idUsuario: string,
): Promise<Estimacion> {
  return cambiarEstadoEstimacion(
    idObra,
    idEstimacion,
    ESTADO_POR_REVISAR,
    idUsuario,
  );
}

export async function enviarAResidente(
  idObra: string,
  idEstimacion: string,
  idUsuario: string,
): Promise<Estimacion> {
  return cambiarEstadoEstimacion(
    idObra,
    idEstimacion,
    ESTADO_REVISADA,
    idUsuario,
  );
}

export async function autorizarEstimacion(
  idObra: string,
  idEstimacion: string,
  idUsuario: string,
  password?: string,
): Promise<Estimacion> {
  return cambiarEstadoEstimacion(
    idObra,
    idEstimacion,
    ESTADO_APROBADA,
    idUsuario,
    password,
  );
}

export async function rechazarEstimacion(
  idObra: string,
  idEstimacion: string,
  idUsuario: string,
): Promise<Estimacion> {
  return cambiarEstadoEstimacion(idObra, idEstimacion, ESTADO_DEVUELTA, idUsuario);
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

  if (estado === ESTADO_APROBADA) {
    const firmas = generarPaqueteFirmas({
      folio: estimacion.folio,
      idEstimacion: estimacion.id_estimacion,
    });

    return autorizarConFirmasRepo(idEstimacion, firmas);
  }

  return actualizarEstadoRepo(idEstimacion, estado);
}

/**
 * RF3.5 / RF3.8 - Candado legal: solo las estimaciones editables
 * (Creada o Devuelta) pueden eliminarse.
 */
export async function asegurarEstimacionNoAutorizada(
  idObra: string,
  idEstimacion: string,
): Promise<void> {
  const estimacion = await obtenerEstimacionPorId(idEstimacion);

  if (!estimacion || estimacion.id_obra !== idObra) {
    throw new AppError(404, 'Estimación no encontrada en esta obra');
  }

  if (!esEstimacionEditable(estimacion.estado)) {
    throw new AppError(
      403,
      `RF3.8 - Una estimación en estado "${estimacion.estado}" es inmutable y no puede eliminarse`,
    );
  }
}

/**
 * Elimina una estimación. Bloqueada si ya es terminal (RF3.5 / RF3.8).
 */
export async function eliminarEstimacion(
  idObra: string,
  idEstimacion: string,
): Promise<void> {
  await asegurarEstimacionNoAutorizada(idObra, idEstimacion);
  await eliminarEstimacionRepo(idEstimacion);
}

import { obtenerContratoPorObra } from '../repositories/contrato.repository.js';
import {
  listarCatalogoResumen,
  listarDetallesEstimacionesAprobadas,
  listarEstimacionesAprobadas,
  type ConceptoCatalogoResumen,
  type DetalleAprobadoResumen,
  type EstimacionAprobadaResumen,
} from '../repositories/dashboard.repository.js';
import type {
  AgrupacionHistorico,
  DashboardIndicadores,
  PuntoHistorico,
} from '../schemas/dashboard.schemas.js';
import { AppError } from '../shared/errors/AppError.js';

const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function limitarPorcentaje(valor: number): number {
  if (!Number.isFinite(valor)) {
    return 0;
  }
  return redondear(Math.min(100, Math.max(0, valor)));
}

function aFecha(valor: string | null): Date | null {
  if (!valor) {
    return null;
  }
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function porcentajeProgramado(
  inicio: Date | null,
  fin: Date | null,
  corte: Date,
): number {
  if (!inicio || !fin) {
    return 0;
  }
  const total = fin.getTime() - inicio.getTime();
  if (total <= 0) {
    return corte >= fin ? 100 : 0;
  }
  return limitarPorcentaje(((corte.getTime() - inicio.getTime()) / total) * 100);
}

interface AvanceFisico {
  porcentaje: number;
  importe: number;
}

function calcularAvanceFisico(
  catalogo: ConceptoCatalogoResumen[],
  cantidadesPorConcepto: Map<string, number>,
): AvanceFisico {
  if (catalogo.length === 0) {
    return { porcentaje: 0, importe: 0 };
  }

  let pesoTotal = 0;
  let ponderado = 0;
  let importe = 0;

  for (const concepto of catalogo) {
    const peso =
      concepto.importe_total ?? concepto.cantidad * concepto.precio_unitario;
    const avanceCantidad = cantidadesPorConcepto.get(concepto.id_concepto) ?? 0;
    const proporcion =
      concepto.cantidad > 0
        ? Math.min(1, Math.max(0, avanceCantidad / concepto.cantidad))
        : 0;

    pesoTotal += peso;
    ponderado += proporcion * peso;
    importe += avanceCantidad * concepto.precio_unitario;
  }

  return {
    porcentaje:
      pesoTotal > 0 ? limitarPorcentaje((ponderado / pesoTotal) * 100) : 0,
    importe: redondear(importe),
  };
}

function clavePeriodo(fecha: Date, agrupacion: AgrupacionHistorico): string {
  if (agrupacion === 'mes') {
    return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  const { anio, semana } = semanaIso(fecha);
  return `${anio}-W${String(semana).padStart(2, '0')}`;
}

function semanaIso(fecha: Date): { anio: number; semana: number } {
  const copia = new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
  const dia = copia.getUTCDay() || 7;
  copia.setUTCDate(copia.getUTCDate() + 4 - dia);
  const inicioAnio = new Date(Date.UTC(copia.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(
    ((copia.getTime() - inicioAnio.getTime()) / 86400000 + 1) / 7,
  );
  return { anio: copia.getUTCFullYear(), semana };
}

function etiquetaPeriodo(clave: string, agrupacion: AgrupacionHistorico): string {
  if (agrupacion === 'mes') {
    const [anio, mes] = clave.split('-');
    const indice = Number(mes) - 1;
    return `${MESES[indice] ?? mes} ${anio}`;
  }
  return clave.replace('-W', ' sem ');
}

function fechaPeriodo(clave: string): string {
  if (clave.includes('-W')) {
    const [anio, semana] = clave.split('-W');
    const inicioAnio = new Date(Date.UTC(Number(anio), 0, 1));
    const dia = (Number(semana) - 1) * 7;
    inicioAnio.setUTCDate(inicioAnio.getUTCDate() + dia);
    return inicioAnio.toISOString().slice(0, 10);
  }
  return `${clave}-01`;
}

function fechaCorte(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function sumarCantidades(
  destino: Map<string, number>,
  detalle: DetalleAprobadoResumen[],
): void {
  for (const fila of detalle) {
    const cantidad = fila.cantidad_de_esta_estimacion ?? 0;
    destino.set(fila.id_concepto, (destino.get(fila.id_concepto) ?? 0) + cantidad);
  }
}

function calcularHistorico(
  agrupacion: AgrupacionHistorico,
  catalogo: ConceptoCatalogoResumen[],
  importeContrato: number,
  estimaciones: EstimacionAprobadaResumen[],
  detalles: DetalleAprobadoResumen[],
): PuntoHistorico[] {
  const detallesPorEstimacion = new Map<string, DetalleAprobadoResumen[]>();

  for (const fila of detalles) {
    const lista = detallesPorEstimacion.get(fila.id_estimacion) ?? [];
    lista.push(fila);
    detallesPorEstimacion.set(fila.id_estimacion, lista);
  }

  const acumuladoPorPeriodo = new Map<
    string,
    { cantidad: number; importe: number }
  >();
  const cantidadPorConcepto = new Map<string, number>();
  let importeAcumulado = 0;

  for (const estimacion of estimaciones) {
    const fecha =
      aFecha(estimacion.fecha) ??
      aFecha(estimacion.periodo_fin) ??
      aFecha(estimacion.created_at);
    if (!fecha) {
      continue;
    }

    const clave = clavePeriodo(fecha, agrupacion);
    const detalle = detallesPorEstimacion.get(estimacion.id_estimacion) ?? [];
    sumarCantidades(cantidadPorConcepto, detalle);

    const importeDetalle = detalle.reduce(
      (total, fila) => total + (fila.importe ?? 0),
      0,
    );
    importeAcumulado +=
      estimacion.importe_estimacion_actual ?? importeDetalle;

    const avanceFisico = calcularAvanceFisico(catalogo, cantidadPorConcepto);
    const avanceFinanciero =
      importeContrato > 0 ? (importeAcumulado / importeContrato) * 100 : 0;

    acumuladoPorPeriodo.set(clave, {
      cantidad: avanceFisico.porcentaje,
      importe: limitarPorcentaje(avanceFinanciero),
    });
  }

  return [...acumuladoPorPeriodo.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, valor]) => ({
      periodo: clave,
      etiqueta: etiquetaPeriodo(clave, agrupacion),
      fecha: fechaPeriodo(clave),
      avance_fisico: valor.cantidad,
      avance_financiero: valor.importe,
    }));
}

export async function obtenerDashboardObra(
  idObra: string,
  agrupacion: AgrupacionHistorico,
): Promise<DashboardIndicadores> {
  const [contrato, catalogo, estimaciones] = await Promise.all([
    obtenerContratoPorObra(idObra),
    listarCatalogoResumen(idObra),
    listarEstimacionesAprobadas(idObra),
  ]);

  if (!contrato && catalogo.length === 0 && estimaciones.length === 0) {
    throw new AppError(404, 'La obra no tiene información suficiente para el dashboard');
  }

  const detalles = await listarDetallesEstimacionesAprobadas(
    estimaciones.map((estimacion) => estimacion.id_estimacion),
  );

  const importeContrato = contrato?.importe_contrato ?? 0;
  const hoy = new Date();

  const cantidadesPorConcepto = new Map<string, number>();
  sumarCantidades(cantidadesPorConcepto, detalles);

  const avanceFisicoReal = calcularAvanceFisico(catalogo, cantidadesPorConcepto);

  let importeEjecutado = 0;
  let importeFisicoMonetizado = 0;
  let importeFinancieroCobrado = 0;
  let tieneMonetizado = false;
  let tieneCobrado = false;

  for (const fila of detalles) {
    importeEjecutado += fila.importe ?? 0;

    if (fila.avance_fisico_monetizado !== null) {
      tieneMonetizado = true;
      importeFisicoMonetizado += fila.avance_fisico_monetizado;
    }

    if (fila.avance_financiero_cobrado !== null) {
      tieneCobrado = true;
      importeFinancieroCobrado += fila.avance_financiero_cobrado;
    }
  }

  if (importeEjecutado === 0) {
    importeEjecutado = estimaciones.reduce(
      (total, estimacion) => total + (estimacion.importe_estimacion_actual ?? 0),
      0,
    );
  }

  let importePagado = 0;
  let importeRetenciones = 0;

  for (const estimacion of estimaciones) {
    const retenciones =
      (estimacion.importe_retencion_sfp ?? 0) +
      (estimacion.importe_retencion_atraso_programa ?? 0);

    importeRetenciones += retenciones;
    importePagado +=
      estimacion.importe_neto_a_recibir ??
      Math.max(0, (estimacion.importe_estimacion_actual ?? 0) - retenciones);
  }

  const saldoPorPagar = Math.max(
    0,
    importeContrato - importePagado - importeRetenciones,
  );

  const avanceFinancieroReal =
    importeContrato > 0 ? (importeEjecutado / importeContrato) * 100 : 0;
  const avanceFisicoMonetizado = tieneMonetizado
    ? importeContrato > 0
      ? (importeFisicoMonetizado / importeContrato) * 100
      : 0
    : avanceFisicoReal.porcentaje;
  const avanceFinancieroCobrado = tieneCobrado
    ? importeContrato > 0
      ? (importeFinancieroCobrado / importeContrato) * 100
      : 0
    : avanceFinancieroReal;

  const inicio = aFecha(contrato?.periodo_ejecucion_inicio ?? null);
  const fin = aFecha(contrato?.periodo_ejecucion_fin ?? null);
  const programado = porcentajeProgramado(inicio, fin, hoy);

  return {
    avance_fisico_real: limitarPorcentaje(avanceFisicoReal.porcentaje),
    avance_fisico_programado: programado,
    avance_financiero_real: limitarPorcentaje(avanceFinancieroReal),
    avance_financiero_programado: programado,
    avance_fisico_monetizado: limitarPorcentaje(avanceFisicoMonetizado),
    avance_financiero_cobrado: limitarPorcentaje(avanceFinancieroCobrado),
    desfase_alerta:
      limitarPorcentaje(avanceFisicoMonetizado) <
      limitarPorcentaje(avanceFinancieroReal),
    importe_contrato: redondear(importeContrato),
    importe_ejecutado: redondear(importeEjecutado),
    importe_fisico_monetizado: tieneMonetizado
      ? redondear(importeFisicoMonetizado)
      : avanceFisicoReal.importe,
    fecha_corte: fechaCorte(hoy),
    recursos_financieros: {
      pagado: redondear(importePagado),
      saldo_por_pagar: redondear(saldoPorPagar),
      retenciones: redondear(importeRetenciones),
    },
    historico: calcularHistorico(
      agrupacion,
      catalogo,
      importeContrato,
      estimaciones,
      detalles,
    ),
  };
}

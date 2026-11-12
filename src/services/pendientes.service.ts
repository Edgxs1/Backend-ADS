import {
  listarNotasPendientesFirma,
  listarEstimacionesPendientes,
  listarReportesPendientes,
  type ColumnaFirmaNota,
} from '../repositories/pendientes.repository.js';
import { ESTADO_POR_REVISAR as ESTADO_REPORTE_POR_REVISAR } from '../repositories/reporte.repository.js';
import {
  ESTADO_CREADA,
  ESTADO_POR_REVISAR,
  ESTADO_RECHAZADA,
  ESTADO_REVISADA,
} from '../repositories/estimacion.repository.js';
import { listarObras, listarObrasAsignadas, type Obra } from '../repositories/obra.repository.js';
import type { TareaPendiente, TipoPendiente } from '../schemas/pendientes.schemas.js';
import { AppError } from '../shared/errors/AppError.js';
import type { Rol } from '../shared/types/roles.js';

interface ContextoRol {
  estadosEstimacion: string[];
  firma: ColumnaFirmaNota | null;
  incluirReportes: boolean;
  todasLasObras: boolean;
}

const CONTEXTO_POR_ROL: Record<Rol, ContextoRol> = {
  Administrador: {
    estadosEstimacion: [ESTADO_CREADA, ESTADO_POR_REVISAR, ESTADO_REVISADA],
    firma: null,
    incluirReportes: true,
    todasLasObras: true,
  },
  Directivo: {
    estadosEstimacion: [ESTADO_CREADA, ESTADO_POR_REVISAR, ESTADO_REVISADA],
    firma: null,
    incluirReportes: true,
    todasLasObras: true,
  },
  Superintendente: {
    estadosEstimacion: [ESTADO_CREADA, ESTADO_RECHAZADA],
    firma: 'firma_superintendente',
    incluirReportes: false,
    todasLasObras: false,
  },
  Supervisor: {
    estadosEstimacion: [ESTADO_POR_REVISAR],
    firma: 'firma_supervisor',
    incluirReportes: false,
    todasLasObras: false,
  },
  Residente: {
    estadosEstimacion: [ESTADO_REVISADA],
    firma: 'firma_residente',
    incluirReportes: true,
    todasLasObras: false,
  },
};

const ACCION_POR_ESTADO: Record<string, string> = {
  [ESTADO_CREADA]: 'Presentar estimación',
  [ESTADO_RECHAZADA]: 'Corregir y reenviar estimación',
  [ESTADO_POR_REVISAR]: 'Revisar estimación',
  [ESTADO_REVISADA]: 'Autorizar o rechazar estimación',
};

function recortar(texto: string, maximo = 140): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > maximo ? `${limpio.slice(0, maximo - 1)}…` : limpio;
}

function fechaTarea(fecha: string | null): string | null {
  if (!fecha) {
    return null;
  }
  return fecha.slice(0, 10);
}

async function obrasDelRol(
  idUsuario: string,
  rol: Rol,
  contexto: ContextoRol,
): Promise<Obra[]> {
  if (contexto.todasLasObras) {
    return listarObras();
  }
  return listarObrasAsignadas(idUsuario);
}

export async function obtenerPendientesPorRol(
  idUsuario: string,
  rol: Rol | null,
): Promise<TareaPendiente[]> {
  if (!rol) {
    throw new AppError(403, 'Acceso denegado: no se pudo determinar el rol del usuario');
  }

  const contexto = CONTEXTO_POR_ROL[rol];
  const obras = await obrasDelRol(idUsuario, rol, contexto);
  const nombresObra = new Map(obras.map((obra) => [obra.id_obra, obra.nombre]));
  const idsObra = obras.map((obra) => obra.id_obra);

  const [estimaciones, notas, reportes] = await Promise.all([
    listarEstimacionesPendientes(idsObra, contexto.estadosEstimacion),
    contexto.firma
      ? listarNotasPendientesFirma(idsObra, contexto.firma, null)
      : Promise.all(
          (
            [
              'firma_superintendente',
              'firma_supervisor',
              'firma_residente',
            ] as ColumnaFirmaNota[]
          ).map((columna) => listarNotasPendientesFirma(idsObra, columna, null)),
        ).then((listas) => listas.flat()),
    contexto.incluirReportes
      ? listarReportesPendientes(idsObra, ESTADO_REPORTE_POR_REVISAR)
      : Promise.resolve([]),
  ]);

  const tareas: TareaPendiente[] = [];
  const idsNotaVistos = new Set<string>();

  for (const estimacion of estimaciones) {
    tareas.push({
      id: estimacion.id_estimacion,
      tipo: 'estimacion',
      id_obra: estimacion.id_obra,
      obra: nombresObra.get(estimacion.id_obra) ?? 'Obra',
      titulo: `Estimación ${estimacion.folio}`,
      descripcion:
        ACCION_POR_ESTADO[estimacion.estado] ?? `Atender estimación (${estimacion.estado})`,
      estado: estimacion.estado,
      fecha: fechaTarea(estimacion.fecha ?? estimacion.periodo_fin),
      ruta: `/dashboard/estimaciones/${estimacion.id_estimacion}`,
    });
  }

  for (const nota of notas) {
    if (idsNotaVistos.has(nota.id_nota)) {
      continue;
    }
    idsNotaVistos.add(nota.id_nota);
    tareas.push({
      id: nota.id_nota,
      tipo: 'bitacora',
      id_obra: nota.id_obra,
      obra: nombresObra.get(nota.id_obra) ?? 'Obra',
      titulo: 'Nota de bitácora pendiente de firma',
      descripcion: recortar(nota.texto || 'Nota sin contenido'),
      estado: nota.estado ?? 'Pendiente de Firma',
      fecha: fechaTarea(nota.created_at),
      ruta: `/dashboard/bitacora`,
    });
  }

  for (const reporte of reportes) {
    tareas.push({
      id: reporte.id_reporte,
      tipo: 'reporte',
      id_obra: reporte.id_obra,
      obra: nombresObra.get(reporte.id_obra) ?? 'Obra',
      titulo: 'Reporte diario por validar',
      descripcion: recortar(
        reporte.actividades_realizadas || 'Reporte pendiente de validación',
      ),
      estado: reporte.estado,
      fecha: fechaTarea(reporte.created_at),
      ruta: `/dashboard/reportes/${reporte.id_reporte}`,
    });
  }

  const prioridad: Record<TipoPendiente, number> = {
    estimacion: 0,
    reporte: 1,
    bitacora: 2,
  };

  return tareas.sort((a, b) => {
    const porTipo = prioridad[a.tipo] - prioridad[b.tipo];
    if (porTipo !== 0) {
      return porTipo;
    }
    return (a.fecha ?? '').localeCompare(b.fecha ?? '');
  });
}

import {
  actualizarEstadoReporte as actualizarEstadoRepo,
  actualizarReporte as actualizarReporteRepo,
  crearReporte as crearReporteRepo,
  obtenerReportePorId,
  obtenerReportesPorObra as obtenerReportesRepo,
  ESTADO_POR_REVISAR,
  ESTADO_VALIDADO,
} from '../repositories/reporte.repository.js';
import type { Reporte, ReporteConCreador } from '../repositories/reporte.repository.js';
import { findUsuarioPorId } from '../repositories/usuarios.repository.js';
import { AppError } from '../shared/errors/AppError.js';
import { ROL_BY_ID } from '../shared/types/roles.js';
import type { Rol } from '../shared/types/roles.js';
import type {
  CambiarEstadoReporteDto,
  CrearReporteDto,
} from '../schemas/reporte.schemas.js';

async function obtenerRolActuante(idUsuario: string): Promise<Rol> {
  const usuario = await findUsuarioPorId(idUsuario);
  const rol = usuario ? ROL_BY_ID[usuario.id_rol] : undefined;

  if (!rol) {
    throw new AppError(403, 'Acceso denegado: no se pudo determinar tu rol');
  }

  return rol;
}

export async function registrarReporte(
  idObra: string,
  idCreador: string,
  input: CrearReporteDto,
): Promise<Reporte> {
  return crearReporteRepo({
    id_obra: idObra,
    id_creador: idCreador,
    actividades_realizadas: input.actividades_realizadas ?? null,
    notas_relevantes: input.notas_relevantes ?? null,
    hora_lluvia: input.hora_lluvia ?? null,
    estado_tiempo: input.estado_tiempo ?? null,
    senalamiento_preventivo: input.senalamiento_preventivo ?? null,
    equipo_proteccion: input.equipo_proteccion ?? null,
    suministro_materiales: input.suministro_materiales ?? null,
    estado_personal: input.estado_personal ?? null,
    estado_maquinaria: input.estado_maquinaria ?? null,
    estado_equipo: input.estado_equipo ?? null,
    avance_general: input.avance_general,
    fecha_estimada_conclusion: input.fecha_estimada_conclusion,
    condicionantes: input.condicionantes ?? [],
    problematica: input.problematica ?? [],
    interferencias: input.interferencias ?? [],
    conceptos_relevantes: input.conceptos_relevantes ?? [],
    recursos_utilizados: input.recursos_utilizados ?? [],
  });
}

export async function actualizarReporte(
  idObra: string,
  idReporte: string,
  idUsuario: string,
  input: CrearReporteDto,
): Promise<Reporte> {
  const rol = await obtenerRolActuante(idUsuario);

  if (rol !== 'Supervisor') {
    throw new AppError(403, 'Solo el rol Supervisor puede actualizar el reporte diario');
  }

  const reporte = await obtenerReportePorId(idReporte);

  if (!reporte || reporte.id_obra !== idObra) {
    throw new AppError(404, 'Reporte no encontrado en esta obra');
  }

  if (reporte.estado === ESTADO_VALIDADO) {
    throw new AppError(409, 'No se puede actualizar un reporte ya validado');
  }

  return actualizarReporteRepo(idReporte, {
    actividades_realizadas: input.actividades_realizadas ?? null,
    notas_relevantes: input.notas_relevantes ?? null,
    hora_lluvia: input.hora_lluvia ?? null,
    estado_tiempo: input.estado_tiempo ?? null,
    senalamiento_preventivo: input.senalamiento_preventivo ?? null,
    equipo_proteccion: input.equipo_proteccion ?? null,
    suministro_materiales: input.suministro_materiales ?? null,
    estado_personal: input.estado_personal ?? null,
    estado_maquinaria: input.estado_maquinaria ?? null,
    estado_equipo: input.estado_equipo ?? null,
    avance_general: input.avance_general,
    fecha_estimada_conclusion: input.fecha_estimada_conclusion,
    condicionantes: input.condicionantes ?? [],
    problematica: input.problematica ?? [],
    interferencias: input.interferencias ?? [],
    conceptos_relevantes: input.conceptos_relevantes ?? [],
    recursos_utilizados: input.recursos_utilizados ?? [],
    estado: ESTADO_POR_REVISAR,
  });
}

export async function listarReportesPorObra(
  idObra: string,
): Promise<ReporteConCreador[]> {
  return obtenerReportesRepo(idObra);
}

export async function cambiarEstadoReporte(
  idReporte: string,
  idUsuario: string,
  input: CambiarEstadoReporteDto,
): Promise<Reporte> {
  const rol = await obtenerRolActuante(idUsuario);

  if (rol === 'Residente') {
    if (input.estado !== ESTADO_VALIDADO) {
      throw new AppError(
        403,
        'Un Residente solo puede validar reportes',
      );
    }
  } else if (rol === 'Administrador') {
    if (input.estado === ESTADO_VALIDADO) {
      throw new AppError(
        403,
        'Un Administrador no puede validar reportes; solo puede regresarlos a "Por revisar"',
      );
    }
  } else {
    throw new AppError(403, 'Acceso denegado: tu rol no puede cambiar el estado de un reporte');
  }

  const reporte = await obtenerReportePorId(idReporte);

  if (!reporte) {
    throw new AppError(404, 'Reporte no encontrado');
  }

  return actualizarEstadoRepo(idReporte, input.estado);
}

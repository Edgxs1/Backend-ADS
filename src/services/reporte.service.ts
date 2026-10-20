import {
  actualizarEstadoReporte as actualizarEstadoRepo,
  crearReporte as crearReporteRepo,
  obtenerReportePorId,
  obtenerReportesPorObra as obtenerReportesRepo,
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
    condicionantes: input.condicionantes,
    avance_general: input.avance_general,
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

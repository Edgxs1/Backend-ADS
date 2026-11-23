import { findAsignacionActiva } from '../../repositories/asignaciones.repository.js';
import { AppError } from '../errors/AppError.js';

export function verificarRegistroDeObra(
  idObraRuta: string,
  idObraRegistro: string,
  mensaje = 'Registro no encontrado en esta obra',
): void {
  if (idObraRegistro !== idObraRuta) {
    throw new AppError(404, mensaje);
  }
}

export async function verificarAccesoObra(
  idUsuario: string,
  idObra: string,
): Promise<void> {
  const asignacion = await findAsignacionActiva(idUsuario, idObra);

  if (!asignacion) {
    throw new AppError(403, 'Acceso denegado: no estás asignado a esta obra');
  }
}

export async function verificarRegistroDeObraAsignada(
  idUsuario: string,
  idObraRuta: string,
  idObraRegistro: string,
  mensaje?: string,
): Promise<void> {
  verificarRegistroDeObra(idObraRuta, idObraRegistro, mensaje);
  await verificarAccesoObra(idUsuario, idObraRuta);
}

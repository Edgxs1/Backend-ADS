import {
  actualizarEstadoNota as actualizarEstadoRepo,
  actualizarTextoNota as actualizarTextoRepo,
  crearNota as crearNotaRepo,
  eliminarNota as eliminarNotaRepo,
  ESTADO_ABIERTA,
  ESTADO_FIRMADA,
  obtenerNotaPorId,
  obtenerNotasPorObra as obtenerNotasRepo,
} from '../repositories/bitacora.repository.js';
import type {
  NotaBitacora,
  NotaConCreador,
} from '../repositories/bitacora.repository.js';
import { findUsuarioPorId } from '../repositories/usuarios.repository.js';
import { AppError } from '../shared/errors/AppError.js';
import { ROL_BY_ID } from '../shared/types/roles.js';
import type { Rol } from '../shared/types/roles.js';
import type {
  CambiarEstadoNotaDto,
  CrearNotaDto,
  EditarNotaDto,
} from '../schemas/bitacora.schemas.js';

async function obtenerRolActuante(idUsuario: string): Promise<Rol> {
  const usuario = await findUsuarioPorId(idUsuario);
  const rol = usuario ? ROL_BY_ID[usuario.id_rol] : undefined;

  if (!rol) {
    throw new AppError(403, 'Acceso denegado: no se pudo determinar tu rol');
  }

  return rol;
}

/**
 * Candado de Inmutabilidad Legal.
 * Una vez que una nota está "Firmada", no puede editarse ni eliminarse.
 */
async function asegurarNotaEditable(idNota: string): Promise<NotaBitacora> {
  const nota = await obtenerNotaPorId(idNota);

  if (!nota) {
    throw new AppError(404, 'Nota de bitácora no encontrada');
  }

  if (nota.estado === ESTADO_FIRMADA) {
    throw new AppError(
      403,
      'Nota inmutable: una nota firmada no puede editarse ni eliminarse',
    );
  }

  return nota;
}

function verificarPropiedadOAmin(nota: NotaBitacora, idUsuario: string, rol: Rol): void {
  if (rol === 'Administrador') {
    return;
  }

  if (nota.id_creador !== idUsuario) {
    throw new AppError(
      403,
      'Acceso denegado: solo el creador de la nota o un Administrador pueden modificarla',
    );
  }
}

export async function registrarNota(
  idObra: string,
  idCreador: string,
  input: CrearNotaDto,
): Promise<NotaBitacora> {
  return crearNotaRepo({
    id_obra: idObra,
    id_creador: idCreador,
    texto: input.texto,
  });
}

export async function listarNotasPorObra(
  idObra: string,
): Promise<NotaConCreador[]> {
  return obtenerNotasRepo(idObra);
}

export async function editarNota(
  idNota: string,
  idUsuario: string,
  input: EditarNotaDto,
): Promise<NotaBitacora> {
  const nota = await asegurarNotaEditable(idNota);
  const rol = await obtenerRolActuante(idUsuario);

  verificarPropiedadOAmin(nota, idUsuario, rol);

  return actualizarTextoRepo(idNota, input.texto);
}

export async function eliminarNota(idNota: string, idUsuario: string): Promise<void> {
  const nota = await asegurarNotaEditable(idNota);
  const rol = await obtenerRolActuante(idUsuario);

  verificarPropiedadOAmin(nota, idUsuario, rol);

  await eliminarNotaRepo(idNota);
}

export async function firmarNota(
  idNota: string,
  idUsuario: string,
  input: CambiarEstadoNotaDto,
): Promise<NotaBitacora> {
  const rol = await obtenerRolActuante(idUsuario);

  if (rol !== 'Residente') {
    throw new AppError(403, 'Acceso denegado: solo un Residente puede firmar notas');
  }

  if (input.estado !== ESTADO_FIRMADA) {
    throw new AppError(403, 'Un Residente solo puede firmar la nota (Abierta → Firmada)');
  }

  const nota = await asegurarNotaEditable(idNota);

  if (nota.estado !== ESTADO_ABIERTA) {
    throw new AppError(403, 'Solo se pueden firmar notas en estado "Abierta"');
  }

  return actualizarEstadoRepo(idNota, ESTADO_FIRMADA);
}

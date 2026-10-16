import {
  crearObra,
  desactivarObra,
  listarObras,
  listarObrasAsignadas,
} from '../repositories/obra.repository.js';
import type { CrearObraInput, Obra } from '../repositories/obra.repository.js';
import { findUsuarioPorId } from '../repositories/usuarios.repository.js';
import { AppError } from '../shared/errors/AppError.js';
import { ROL_BY_ID } from '../shared/types/roles.js';

export async function registrarObra(input: CrearObraInput): Promise<Obra> {
  return crearObra(input);
}

export async function obtenerObras(): Promise<Obra[]> {
  return listarObras();
}

export async function obtenerObrasAsignadas(idUsuario: string): Promise<Obra[]> {
  const usuario = await findUsuarioPorId(idUsuario);
  const rol = usuario ? ROL_BY_ID[usuario.id_rol] : undefined;

  if (rol === 'Administrador') {
    return listarObras();
  }

  return listarObrasAsignadas(idUsuario);
}

export async function eliminarObra(idObra: string): Promise<void> {
  const desactivada = await desactivarObra(idObra);

  if (!desactivada) {
    throw new AppError(404, 'Obra no encontrada o ya inactiva');
  }
}

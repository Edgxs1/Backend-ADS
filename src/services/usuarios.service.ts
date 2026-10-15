import { findUsuarioPorId } from '../repositories/usuarios.repository.js';
import { AppError } from '../shared/errors/AppError.js';
import { ROL_BY_ID } from '../shared/types/roles.js';
import type { Rol } from '../shared/types/roles.js';

export interface PerfilUsuario {
  id_usuario: string;
  correo: string;
  id_rol: number;
  rol: Rol | null;
}

export async function obtenerPerfil(
  idUsuario: string,
  accessToken: string,
): Promise<PerfilUsuario> {
  const usuario = await findUsuarioPorId(idUsuario, accessToken);

  if (!usuario) {
    throw new AppError(404, 'Usuario no encontrado en el sistema');
  }

  return {
    id_usuario: usuario.id_usuario,
    correo: usuario.correo,
    id_rol: usuario.id_rol,
    rol: ROL_BY_ID[usuario.id_rol] ?? null,
  };
}

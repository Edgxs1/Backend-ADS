import {
  actualizarPerfilUsuario,
  findUsuarioPorId,
} from '../repositories/usuarios.repository.js';
import { AppError } from '../shared/errors/AppError.js';
import { ROL_BY_ID } from '../shared/types/roles.js';
import type { Rol } from '../shared/types/roles.js';
import { supabaseAdmin } from '../config/supabase.js';

export interface PerfilUsuario {
  id_usuario: string;
  correo: string;
  id_rol: number;
  rol: Rol | null;
  rfc: string | null;
  telefono: string | null;
  cedula_profesional: string | null;
  activo: boolean;
}

export async function obtenerPerfil(idUsuario: string): Promise<PerfilUsuario> {
  const usuario = await findUsuarioPorId(idUsuario);

  if (!usuario) {
    throw new AppError(404, 'Usuario no encontrado en el sistema');
  }

  return {
    id_usuario: usuario.id_usuario,
    correo: usuario.correo,
    id_rol: usuario.id_rol,
    rol: ROL_BY_ID[usuario.id_rol] ?? null,
    rfc: usuario.rfc,
    telefono: usuario.telefono,
    cedula_profesional: usuario.cedula_profesional,
    activo: usuario.activo,
  };
}

export interface ActualizarPerfilDto {
  rfc?: string | null;
  telefono?: string | null;
  cedula_profesional?: string | null;
}

export async function actualizarPerfil(
  idUsuario: string,
  input: ActualizarPerfilDto,
): Promise<PerfilUsuario> {
  const usuario = await actualizarPerfilUsuario(idUsuario, input);

  return {
    id_usuario: usuario.id_usuario,
    correo: usuario.correo,
    id_rol: usuario.id_rol,
    rol: ROL_BY_ID[usuario.id_rol] ?? null,
    rfc: usuario.rfc,
    telefono: usuario.telefono,
    cedula_profesional: usuario.cedula_profesional,
    activo: usuario.activo,
  };
}

export async function cambiarContrasena(
  idUsuario: string,
  nuevaContrasena: string,
): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(idUsuario, {
    password: nuevaContrasena,
  });

  if (error) {
    throw new AppError(400, error.message);
  }
}

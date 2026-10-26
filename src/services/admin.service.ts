import { supabaseAdmin } from '../config/supabase.js';
import {
  actualizarRolUsuario as actualizarRolUsuarioRepo,
  asegurarUsuarioPublico,
  cerrarAsignacion,
  crearAsignacion,
  findAsignacionActivaEnObra,
  listarAsignacionesPorObra,
  listarUsuarios as listarUsuariosRepo,
} from '../repositories/admin.repository.js';
import { actualizarEstadoUsuario as actualizarEstadoUsuarioRepo } from '../repositories/usuarios.repository.js';
import type { Asignacion, UsuarioPublico } from '../repositories/admin.repository.js';
import type {
  ActualizarRolDto,
  AsignarDto,
  CrearUsuarioDto,
} from '../schemas/admin.schemas.js';
import { AppError } from '../shared/errors/AppError.js';
import { ROL_BY_ID } from '../shared/types/roles.js';
import type { Rol } from '../shared/types/roles.js';

export interface UsuarioAdmin {
  id_usuario: string;
  correo: string;
  id_rol: number | null;
  rol: Rol | null;
  rfc: string | null;
  telefono: string | null;
  cedula_profesional: string | null;
  activo: boolean;
}

export interface AsignacionAdmin extends Asignacion {
  correo: string;
  id_rol: number | null;
  rol: Rol | null;
}

function nombreRol(idRol: number | null): Rol | null {
  return idRol != null ? ROL_BY_ID[idRol] ?? null : null;
}

export async function crearUsuario(input: CrearUsuarioDto): Promise<UsuarioAdmin> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    ...(input.password ? { password: input.password, email_confirm: true } : {}),
  });

  if (error || !data.user) {
    throw new AppError(400, error?.message ?? 'No se pudo crear el usuario');
  }

  const publico: UsuarioPublico = await asegurarUsuarioPublico(
    data.user.id,
    data.user.email ?? input.email,
  );

  if (input.id_rol) {
    const actualizado = await actualizarRolUsuarioRepo(data.user.id, input.id_rol);

    return {
      id_usuario: actualizado.id_usuario,
      correo: actualizado.correo,
      id_rol: actualizado.id_rol,
      rol: nombreRol(actualizado.id_rol),
      rfc: actualizado.rfc,
      telefono: actualizado.telefono,
      cedula_profesional: actualizado.cedula_profesional,
      activo: actualizado.activo,
    };
  }

  return {
    id_usuario: publico.id_usuario,
    correo: publico.correo,
    id_rol: null,
    rol: null,
    rfc: null,
    telefono: null,
    cedula_profesional: null,
    activo: true,
  };
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const usuarios = await listarUsuariosRepo();

  return usuarios.map((usuario) => ({
    id_usuario: usuario.id_usuario,
    correo: usuario.correo,
    id_rol: usuario.id_rol,
    rol: nombreRol(usuario.id_rol),
    rfc: usuario.rfc,
    telefono: usuario.telefono,
    cedula_profesional: usuario.cedula_profesional,
    activo: usuario.activo,
  }));
}

export async function actualizarEstadoUsuario(
  idUsuario: string,
  activo: boolean,
): Promise<UsuarioAdmin> {
  const actualizado = await actualizarEstadoUsuarioRepo(idUsuario, activo);

  return {
    id_usuario: actualizado.id_usuario,
    correo: actualizado.correo,
    id_rol: actualizado.id_rol,
    rol: nombreRol(actualizado.id_rol),
    rfc: actualizado.rfc,
    telefono: actualizado.telefono,
    cedula_profesional: actualizado.cedula_profesional,
    activo: actualizado.activo,
  };
}

export async function actualizarRolUsuario(
  idUsuario: string,
  input: ActualizarRolDto,
): Promise<UsuarioAdmin> {
  const actualizado = await actualizarRolUsuarioRepo(idUsuario, input.id_rol);

  return {
    id_usuario: actualizado.id_usuario,
    correo: actualizado.correo,
    id_rol: actualizado.id_rol,
    rol: nombreRol(actualizado.id_rol),
    rfc: actualizado.rfc,
    telefono: actualizado.telefono,
    cedula_profesional: actualizado.cedula_profesional,
    activo: actualizado.activo,
  };
}

export async function asignarUsuario(input: AsignarDto): Promise<Asignacion> {
  const activa = await findAsignacionActivaEnObra(input.id_usuario, input.id_obra);

  if (activa) {
    await cerrarAsignacion(activa.id_asignacion);
  }

  return crearAsignacion(input);
}

export async function listarAsignacionesObra(idObra: string): Promise<AsignacionAdmin[]> {
  const asignaciones = await listarAsignacionesPorObra(idObra);

  return asignaciones.map((asignacion) => ({
    ...asignacion,
    rol: nombreRol(asignacion.id_rol),
  }));
}

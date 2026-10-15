import { supabaseAdmin } from '../config/supabase.js';
import {
  actualizarRolUsuario as actualizarRolUsuarioRepo,
  asegurarUsuarioPublico,
  cerrarAsignacion,
  crearAsignacion,
  findAsignacionActivaEnObra,
} from '../repositories/admin.repository.js';
import type {
  Asignacion,
  UsuarioConRol,
  UsuarioPublico,
} from '../repositories/admin.repository.js';
import type { ActualizarRolDto, AsignarDto } from '../schemas/admin.schemas.js';
import { AppError } from '../shared/errors/AppError.js';

export async function crearUsuario(email: string): Promise<UsuarioPublico> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email });

  if (error || !data.user) {
    throw new AppError(400, 'No se pudo crear el usuario');
  }

  return asegurarUsuarioPublico(data.user.id, data.user.email ?? email);
}

export async function actualizarRolUsuario(
  idUsuario: string,
  input: ActualizarRolDto,
): Promise<UsuarioConRol> {
  return actualizarRolUsuarioRepo(idUsuario, input.id_rol);
}

export async function asignarUsuario(input: AsignarDto): Promise<Asignacion> {
  const activa = await findAsignacionActivaEnObra(input.id_usuario, input.id_obra);

  if (activa) {
    await cerrarAsignacion(activa.id_asignacion);
  }

  return crearAsignacion(input);
}

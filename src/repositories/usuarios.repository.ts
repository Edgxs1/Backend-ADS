import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export interface UsuarioRol {
  id_usuario: string;
  correo: string;
  id_rol: number;
  rfc: string | null;
  telefono: string | null;
  cedula_profesional: string | null;
  activo: boolean;
}

const COLUMNS =
  'id_usuario, correo, id_rol, rfc, telefono, cedula_profesional, activo';

function normalizar(data: Record<string, unknown>): UsuarioRol {
  return {
    id_usuario: String(data.id_usuario),
    correo: String(data.correo),
    id_rol: Number(data.id_rol),
    rfc: data.rfc === null || data.rfc === undefined ? null : String(data.rfc),
    telefono:
      data.telefono === null || data.telefono === undefined
        ? null
        : String(data.telefono),
    cedula_profesional:
      data.cedula_profesional === null || data.cedula_profesional === undefined
        ? null
        : String(data.cedula_profesional),
    activo: data.activo === false ? false : true,
  };
}

export async function findUsuarioPorId(idUsuario: string): Promise<UsuarioRol | null> {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select(COLUMNS)
    .eq('id_usuario', idUsuario)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'Error al verificar el rol del usuario');
  }

  if (!data) {
    return null;
  }

  return normalizar(data as Record<string, unknown>);
}

export interface ActualizarPerfilInput {
  rfc?: string | null;
  telefono?: string | null;
  cedula_profesional?: string | null;
}

export async function actualizarPerfilUsuario(
  idUsuario: string,
  input: ActualizarPerfilInput,
): Promise<UsuarioRol> {
  const payload: Record<string, string | null> = {};

  if (input.rfc !== undefined) payload.rfc = input.rfc;
  if (input.telefono !== undefined) payload.telefono = input.telefono;
  if (input.cedula_profesional !== undefined) {
    payload.cedula_profesional = input.cedula_profesional;
  }

  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .update(payload)
    .eq('id_usuario', idUsuario)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(404, 'No se encontró el usuario para actualizar el perfil');
  }

  return normalizar(data as Record<string, unknown>);
}

export async function actualizarEstadoUsuario(
  idUsuario: string,
  activo: boolean,
): Promise<UsuarioRol> {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .update({ activo })
    .eq('id_usuario', idUsuario)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(404, 'No se encontró el usuario para actualizar su estado');
  }

  return normalizar(data as Record<string, unknown>);
}

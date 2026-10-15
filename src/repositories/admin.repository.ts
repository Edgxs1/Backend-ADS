import { supabaseAdmin } from '../config/supabase.js';
import {
  ESTADO_ASIGNACION_ACTIVO,
  ESTADO_ASIGNACION_INACTIVO,
} from '../shared/constants/asignaciones.js';
import { AppError } from '../shared/errors/AppError.js';

export interface UsuarioPublico {
  id_usuario: string;
  correo: string;
}

export interface UsuarioConRol extends UsuarioPublico {
  id_rol: number;
}

export interface Asignacion {
  id_asignacion: string;
  id_usuario: string;
  id_obra: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
}

export interface CrearAsignacionInput {
  id_usuario: string;
  id_obra: string;
}

const ASIGNACION_COLUMNS =
  'id_asignacion, id_usuario, id_obra, fecha_inicio, fecha_fin, estado';

export async function asegurarUsuarioPublico(
  idUsuario: string,
  correo: string,
): Promise<UsuarioPublico> {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .upsert({ id_usuario: idUsuario, correo }, { onConflict: 'id_usuario' })
    .select('id_usuario, correo')
    .single();

  if (error || !data) {
    throw new AppError(500, 'No se pudo registrar el usuario en public.usuarios');
  }

  return data as UsuarioPublico;
}

export async function findAsignacionActivaEnObra(
  idUsuario: string,
  idObra: string,
): Promise<{ id_asignacion: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('asignaciones_obra')
    .select('id_asignacion')
    .eq('id_usuario', idUsuario)
    .eq('id_obra', idObra)
    .eq('estado', ESTADO_ASIGNACION_ACTIVO)
    .is('fecha_fin', null)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'Error al consultar la asignación activa');
  }

  return data ? { id_asignacion: String(data.id_asignacion) } : null;
}

export async function cerrarAsignacion(idAsignacion: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('asignaciones_obra')
    .update({
      fecha_fin: new Date().toISOString(),
      estado: ESTADO_ASIGNACION_INACTIVO,
    })
    .eq('id_asignacion', idAsignacion);

  if (error) {
    throw new AppError(500, 'No se pudo cerrar la asignación anterior');
  }
}

export async function actualizarRolUsuario(
  idUsuario: string,
  idRol: number,
): Promise<UsuarioConRol> {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .update({ id_rol: idRol })
    .eq('id_usuario', idUsuario)
    .select('id_usuario, correo, id_rol')
    .single();

  if (error || !data) {
    throw new AppError(404, 'No se encontró el usuario para actualizar su rol');
  }

  return data as UsuarioConRol;
}

export async function crearAsignacion(input: CrearAsignacionInput): Promise<Asignacion> {
  const { data, error } = await supabaseAdmin
    .from('asignaciones_obra')
    .insert({
      id_usuario: input.id_usuario,
      id_obra: input.id_obra,
      fecha_inicio: new Date().toISOString(),
      estado: ESTADO_ASIGNACION_ACTIVO,
    })
    .select(ASIGNACION_COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(500, 'No se pudo crear la asignación');
  }

  return data as Asignacion;
}

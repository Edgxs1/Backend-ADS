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
  rfc: string | null;
  telefono: string | null;
  cedula_profesional: string | null;
  activo: boolean;
}

export interface Asignacion {
  id_asignacion: string;
  id_usuario: string;
  id_obra: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
}

export interface UsuarioListado {
  id_usuario: string;
  correo: string;
  id_rol: number | null;
  rfc: string | null;
  telefono: string | null;
  cedula_profesional: string | null;
  activo: boolean;
}

export interface AsignacionConUsuario extends Asignacion {
  correo: string;
  id_rol: number | null;
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
    .select('id_usuario, correo, id_rol, rfc, telefono, cedula_profesional, activo')
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

export async function listarUsuarios(): Promise<UsuarioListado[]> {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id_usuario, correo, id_rol, rfc, telefono, cedula_profesional, activo')
    .order('correo', { ascending: true });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener los usuarios');
  }

  return (data ?? []) as UsuarioListado[];
}

export async function listarAsignacionesPorObra(
  idObra: string,
): Promise<AsignacionConUsuario[]> {
  const { data: asignaciones, error } = await supabaseAdmin
    .from('asignaciones_obra')
    .select(ASIGNACION_COLUMNS)
    .eq('id_obra', idObra)
    .order('fecha_inicio', { ascending: false });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las asignaciones de la obra');
  }

  const filas = (asignaciones ?? []) as Asignacion[];

  if (filas.length === 0) {
    return [];
  }

  const idsUsuario = [...new Set(filas.map((fila) => String(fila.id_usuario)))];

  const { data: usuarios, error: usuariosError } = await supabaseAdmin
    .from('usuarios')
    .select('id_usuario, correo, id_rol')
    .in('id_usuario', idsUsuario);

  if (usuariosError) {
    throw new AppError(500, 'No se pudieron obtener los usuarios asignados');
  }

  const usuariosPorId = new Map(
    ((usuarios ?? []) as UsuarioListado[]).map((usuario) => [
      String(usuario.id_usuario),
      usuario,
    ]),
  );

  return filas.map((fila) => {
    const usuario = usuariosPorId.get(String(fila.id_usuario));

    return {
      ...fila,
      correo: usuario?.correo ?? 'Usuario desconocido',
      id_rol: usuario?.id_rol ?? null,
    };
  });
}

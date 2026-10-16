import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export interface UsuarioRol {
  id_usuario: string;
  correo: string;
  id_rol: number;
}

export async function findUsuarioPorId(idUsuario: string): Promise<UsuarioRol | null> {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id_usuario, correo, id_rol')
    .eq('id_usuario', idUsuario)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'Error al verificar el rol del usuario');
  }

  if (!data) {
    return null;
  }

  return {
    id_usuario: String(data.id_usuario),
    correo: String(data.correo),
    id_rol: Number(data.id_rol),
  };
}

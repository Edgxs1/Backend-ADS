import { supabaseAdmin } from '../config/supabase.js';
import { ESTADO_ASIGNACION_ACTIVO } from '../shared/constants/asignaciones.js';
import { AppError } from '../shared/errors/AppError.js';

export interface AsignacionActiva {
  id_asignacion: string;
}

export async function findAsignacionActiva(
  idUsuario: string,
  idObra: string,
): Promise<AsignacionActiva | null> {
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
    throw new AppError(500, 'Error al verificar el acceso a la obra');
  }

  return data ? { id_asignacion: String(data.id_asignacion) } : null;
}

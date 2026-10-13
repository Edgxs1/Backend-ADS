import { createUserClient } from '../../config/supabase.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ROLES } from '../../shared/types/roles.js';
import type { Rol } from '../../shared/types/roles.js';

export interface AsignacionActiva {
  id: string;
  rol: Rol;
}

function esRolValido(value: unknown): value is Rol {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export async function findAsignacionActiva(
  idUsuario: string,
  idObra: string,
  accessToken: string,
): Promise<AsignacionActiva | null> {
  const supabase = createUserClient(accessToken);

  const { data, error } = await supabase
    .from('asignaciones_obra')
    .select('id, rol')
    .eq('id_usuario', idUsuario)
    .eq('id_obra', idObra)
    .eq('activo', true)
    .is('fecha_fin', null)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'Error al verificar el acceso a la obra');
  }

  if (!data || !esRolValido(data.rol)) {
    return null;
  }

  return { id: String(data.id), rol: data.rol };
}

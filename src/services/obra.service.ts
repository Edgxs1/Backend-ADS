import {
  crearObra,
  desactivarObra,
  listarObras,
} from '../repositories/obra.repository.js';
import type { CrearObraInput, Obra } from '../repositories/obra.repository.js';
import { AppError } from '../shared/errors/AppError.js';

export async function registrarObra(input: CrearObraInput, accessToken: string): Promise<Obra> {
  return crearObra(input, accessToken);
}

export async function obtenerObras(accessToken: string): Promise<Obra[]> {
  return listarObras(accessToken);
}

export async function eliminarObra(idObra: string, accessToken: string): Promise<void> {
  const desactivada = await desactivarObra(idObra, accessToken);

  if (!desactivada) {
    throw new AppError(404, 'Obra no encontrada o ya inactiva');
  }
}

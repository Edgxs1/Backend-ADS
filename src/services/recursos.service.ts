import {
  actualizarRecurso,
  crearRecurso,
  listarRecursosActivosPorObra,
  listarTodosRecursosPorObra,
  type RecursoCatalogo,
} from '../repositories/recursos.repository.js';

export async function obtenerRecursosActivosPorObra(idObra: string): Promise<RecursoCatalogo[]> {
  return listarRecursosActivosPorObra(idObra);
}

export async function obtenerRecursosPorObra(idObra: string): Promise<RecursoCatalogo[]> {
  return listarTodosRecursosPorObra(idObra);
}

export async function registrarRecurso(
  idObra: string,
  input: { tipo: 'PERSONAL' | 'MAQUINARIA' | 'EQUIPO'; descripcion: string },
): Promise<RecursoCatalogo> {
  return crearRecurso(idObra, input);
}

export async function modificarRecurso(
  idRecurso: string,
  input: { descripcion?: string; activo?: boolean },
): Promise<RecursoCatalogo> {
  return actualizarRecurso(idRecurso, input);
}

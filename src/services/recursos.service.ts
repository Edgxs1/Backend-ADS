import {
  actualizarRecurso,
  crearRecurso,
  listarRecursosActivosPorObra,
  listarTodosRecursosPorObra,
  type RecursoCatalogo,
} from '../repositories/recursos.repository.js';
import { verificarAccesoObra } from '../shared/security/acceso-obra.js';

export async function obtenerRecursosActivosPorObra(idObra: string): Promise<RecursoCatalogo[]> {
  return listarRecursosActivosPorObra(idObra);
}

export async function obtenerRecursosPorObra(idObra: string): Promise<RecursoCatalogo[]> {
  return listarTodosRecursosPorObra(idObra);
}

export async function registrarRecurso(
  idObra: string,
  idCreadoPor: string,
  input: { tipo: 'PERSONAL' | 'MAQUINARIA' | 'EQUIPO'; descripcion: string },
): Promise<RecursoCatalogo> {
  return crearRecurso(idObra, idCreadoPor, input);
}

export async function modificarRecurso(
  idObra: string,
  idUsuario: string,
  idRecurso: string,
  input: { descripcion?: string; activo?: boolean },
): Promise<RecursoCatalogo> {
  await verificarAccesoObra(idUsuario, idObra);
  return actualizarRecurso(idObra, idRecurso, input);
}

import {
  actualizarPartida as actualizarPartidaRepo,
  crearPartida as crearPartidaRepo,
  eliminarPartida as eliminarPartidaRepo,
  obtenerPartidasPorObra as obtenerPartidasRepo,
} from '../repositories/partida.repository.js';
import type {
  ActualizarPartidaInput,
  CrearPartidaInput,
  Partida,
} from '../repositories/partida.repository.js';

export async function registrarPartida(
  idObra: string,
  idCreadoPor: string,
  input: CrearPartidaInput,
): Promise<Partida> {
  return crearPartidaRepo(idObra, idCreadoPor, input);
}

export async function listarPartidasPorObra(idObra: string): Promise<Partida[]> {
  return obtenerPartidasRepo(idObra);
}

export async function actualizarPartida(
  idObra: string,
  idPartida: string,
  input: ActualizarPartidaInput,
): Promise<Partida> {
  return actualizarPartidaRepo(idObra, idPartida, input);
}

export async function eliminarPartida(
  idObra: string,
  idPartida: string,
): Promise<void> {
  return eliminarPartidaRepo(idObra, idPartida);
}

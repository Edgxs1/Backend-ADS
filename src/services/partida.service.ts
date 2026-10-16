import {
  crearPartida as crearPartidaRepo,
  obtenerPartidasPorObra as obtenerPartidasRepo,
} from '../repositories/partida.repository.js';
import type { CrearPartidaInput, Partida } from '../repositories/partida.repository.js';

export async function registrarPartida(
  idObra: string,
  input: CrearPartidaInput,
): Promise<Partida> {
  return crearPartidaRepo(idObra, input);
}

export async function listarPartidasPorObra(idObra: string): Promise<Partida[]> {
  return obtenerPartidasRepo(idObra);
}

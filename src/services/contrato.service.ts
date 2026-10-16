import {
  obtenerContratoPorObra as obtenerContratoRepo,
  registrarContrato as registrarContratoRepo,
} from '../repositories/contrato.repository.js';
import type {
  ContratoConContratista,
  RegistrarContratoInput,
} from '../repositories/contrato.repository.js';

export async function registrarContrato(
  idObra: string,
  input: RegistrarContratoInput,
): Promise<ContratoConContratista> {
  return registrarContratoRepo(idObra, input);
}

export async function consultarContratoPorObra(
  idObra: string,
): Promise<ContratoConContratista | null> {
  return obtenerContratoRepo(idObra);
}

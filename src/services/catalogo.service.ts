import {
  crearConcepto as crearConceptoRepo,
  obtenerCatalogosPorObra as obtenerCatalogosRepo,
} from '../repositories/catalogo.repository.js';
import type {
  Concepto,
  ConceptoConPartida,
  CrearConceptoInput,
} from '../repositories/catalogo.repository.js';

export async function registrarConcepto(
  idObra: string,
  input: CrearConceptoInput,
): Promise<Concepto> {
  return crearConceptoRepo(idObra, input);
}

export async function listarCatalogosPorObra(idObra: string): Promise<ConceptoConPartida[]> {
  return obtenerCatalogosRepo(idObra);
}

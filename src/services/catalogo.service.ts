import {
  actualizarConcepto as actualizarConceptoRepo,
  crearConcepto as crearConceptoRepo,
  eliminarConcepto as eliminarConceptoRepo,
  obtenerCatalogosPorObra as obtenerCatalogosRepo,
} from '../repositories/catalogo.repository.js';
import type {
  ActualizarConceptoInput,
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

export async function actualizarConcepto(
  idObra: string,
  idConcepto: string,
  input: ActualizarConceptoInput,
): Promise<Concepto> {
  return actualizarConceptoRepo(idObra, idConcepto, input);
}

export async function eliminarConcepto(
  idObra: string,
  idConcepto: string,
): Promise<void> {
  return eliminarConceptoRepo(idObra, idConcepto);
}

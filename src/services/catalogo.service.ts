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
import type { CatalogoListadoQueryDto } from '../schemas/catalogo.schemas.js';
import { verificarAccesoObra } from '../shared/security/acceso-obra.js';

export async function registrarConcepto(
  idObra: string,
  idCreadoPor: string,
  input: CrearConceptoInput,
): Promise<Concepto> {
  return crearConceptoRepo(idObra, idCreadoPor, input);
}

export async function listarCatalogosPorObra(
  idObra: string,
  opciones?: CatalogoListadoQueryDto,
): Promise<ConceptoConPartida[]> {
  return obtenerCatalogosRepo(idObra, opciones);
}

export async function actualizarConcepto(
  idObra: string,
  idUsuario: string,
  idConcepto: string,
  input: ActualizarConceptoInput,
): Promise<Concepto> {
  await verificarAccesoObra(idUsuario, idObra);
  return actualizarConceptoRepo(idObra, idConcepto, input);
}

export async function eliminarConcepto(
  idObra: string,
  idUsuario: string,
  idConcepto: string,
): Promise<void> {
  await verificarAccesoObra(idUsuario, idObra);
  return eliminarConceptoRepo(idObra, idConcepto);
}

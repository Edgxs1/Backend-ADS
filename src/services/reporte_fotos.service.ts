import {
  contarFotosPorReporte,
  eliminarFotoDB,
  eliminarFotosStorage,
  extraerRutaStorage,
  MAX_FOTOS_POR_REPORTE,
  obtenerFotoPorId,
  obtenerFotosPorReporte as obtenerFotosRepo,
  registrarFotosDB,
  subirFotosStorage,
} from '../repositories/reporte_fotos.repository.js';
import type { DatosFoto, FotoReporte } from '../repositories/reporte_fotos.repository.js';
import { obtenerReportePorId, ESTADO_VALIDADO } from '../repositories/reporte.repository.js';
import { AppError } from '../shared/errors/AppError.js';

async function asegurarReporteEditable(idReporte: string): Promise<void> {
  const reporte = await obtenerReportePorId(idReporte);

  if (!reporte) {
    throw new AppError(404, 'Reporte no encontrado');
  }

  if (reporte.estado === ESTADO_VALIDADO) {
    throw new AppError(
      403,
      'No se pueden modificar fotos de un reporte validado',
    );
  }
}

export async function agregarFotos(
  idReporte: string,
  archivos: DatosFoto[],
): Promise<FotoReporte[]> {
  if (archivos.length === 0) {
    throw new AppError(400, 'No se envió ninguna foto en el campo "fotos"');
  }

  await asegurarReporteEditable(idReporte);

  const existentes = await contarFotosPorReporte(idReporte);

  if (existentes + archivos.length > MAX_FOTOS_POR_REPORTE) {
    throw new AppError(
      400,
      `El reporte admite un máximo de ${MAX_FOTOS_POR_REPORTE} fotos`,
    );
  }

  const subidas = await subirFotosStorage(idReporte, archivos);

  try {
    return await registrarFotosDB(
      idReporte,
      subidas.map((foto) => foto.url),
    );
  } catch (error) {
    await eliminarFotosStorage(subidas.map((foto) => foto.ruta)).catch(() => undefined);
    throw error;
  }
}

export async function listarFotosPorReporte(idReporte: string): Promise<FotoReporte[]> {
  const reporte = await obtenerReportePorId(idReporte);

  if (!reporte) {
    throw new AppError(404, 'Reporte no encontrado');
  }

  return obtenerFotosRepo(idReporte);
}

export async function eliminarFoto(idReporte: string, idFoto: string): Promise<void> {
  await asegurarReporteEditable(idReporte);

  const foto = await obtenerFotoPorId(idFoto);

  if (!foto || foto.id_reporte !== idReporte) {
    throw new AppError(404, 'Foto no encontrada en este reporte');
  }

  const ruta = extraerRutaStorage(foto.url_foto);

  if (ruta) {
    await eliminarFotosStorage([ruta]);
  }

  await eliminarFotoDB(idFoto);
}

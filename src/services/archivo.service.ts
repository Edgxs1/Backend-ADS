import {
  eliminarArchivo as eliminarArchivoRepo,
  eliminarArchivoStorage,
  obtenerArchivosPorObra,
  registrarArchivoDB,
  subirArchivoStorage,
} from '../repositories/archivo.repository.js';
import type { Archivo, CrearArchivoInput } from '../repositories/archivo.repository.js';

export interface DatosArchivo {
  buffer: Buffer;
  mimetype: string;
  nombreOriginal: string;
}

function construirRuta(idObra: string, nombreOriginal: string): string {
  const nombreLimpio = nombreOriginal.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${idObra}/${Date.now()}-${nombreLimpio}`;
}

export async function subirArchivo(
  idObra: string,
  idSubidoPor: string,
  tipoDocumento: string,
  archivo: DatosArchivo,
): Promise<Archivo> {
  const ruta = construirRuta(idObra, archivo.nombreOriginal);
  const urlArchivo = await subirArchivoStorage(ruta, archivo.buffer, archivo.mimetype);

  const input: CrearArchivoInput = {
    id_obra: idObra,
    id_subido_por: idSubidoPor,
    tipo_documento: tipoDocumento,
    url_archivo: urlArchivo,
  };

  try {
    return await registrarArchivoDB(input);
  } catch (error) {
    await eliminarArchivoStorage(ruta).catch(() => undefined);
    throw error;
  }
}

export async function listarArchivosPorObra(idObra: string): Promise<Archivo[]> {
  return obtenerArchivosPorObra(idObra);
}

export async function eliminarArchivoPorId(idArchivo: string): Promise<void> {
  await eliminarArchivoRepo(idArchivo);
}

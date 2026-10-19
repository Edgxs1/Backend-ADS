import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export const BUCKET_EXPEDIENTES = 'expedientes';

export interface Archivo {
  id_archivo: string;
  id_obra: string;
  id_subido_por: string;
  tipo_documento: string;
  url_archivo: string;
  created_at: string;
}

export interface CrearArchivoInput {
  id_obra: string;
  id_subido_por: string;
  tipo_documento: string;
  url_archivo: string;
}

const COLUMNS =
  'id_archivo, id_obra, id_subido_por, tipo_documento, url_archivo, created_at';

function extraerRutaStorage(url: string): string | null {
  const marcador = `/${BUCKET_EXPEDIENTES}/`;
  const indice = url.indexOf(marcador);

  if (indice === -1) {
    return null;
  }

  return url.slice(indice + marcador.length);
}

export async function subirArchivoStorage(
  ruta: string,
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_EXPEDIENTES)
    .upload(ruta, buffer, { contentType: mimetype, upsert: false });

  if (error) {
    throw new AppError(500, 'No se pudo subir el archivo al almacenamiento');
  }

  const { data } = supabaseAdmin.storage.from(BUCKET_EXPEDIENTES).getPublicUrl(ruta);

  return data.publicUrl;
}

export async function eliminarArchivoStorage(ruta: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(BUCKET_EXPEDIENTES).remove([ruta]);

  if (error) {
    throw new AppError(500, 'No se pudo eliminar el archivo del almacenamiento');
  }
}

export async function registrarArchivoDB(input: CrearArchivoInput): Promise<Archivo> {
  const { data, error } = await supabaseAdmin
    .from('archivos_repositorio')
    .insert(input)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError(400, 'No se pudo registrar el archivo en la base de datos');
  }

  return data as Archivo;
}

export async function obtenerArchivosPorObra(idObra: string): Promise<Archivo[]> {
  const { data, error } = await supabaseAdmin
    .from('archivos_repositorio')
    .select(COLUMNS)
    .eq('id_obra', idObra);

  if (error) {
    throw new AppError(500, 'No se pudieron obtener los archivos de la obra');
  }

  return (data ?? []) as Archivo[];
}

export async function eliminarArchivo(idArchivo: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('archivos_repositorio')
    .select('id_archivo, url_archivo')
    .eq('id_archivo', idArchivo)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'No se pudo obtener el archivo');
  }

  if (!data) {
    throw new AppError(404, 'Archivo no encontrado');
  }

  const ruta = extraerRutaStorage(String(data.url_archivo));

  if (ruta) {
    await eliminarArchivoStorage(ruta);
  }

  const { error: errorDelete } = await supabaseAdmin
    .from('archivos_repositorio')
    .delete()
    .eq('id_archivo', idArchivo);

  if (errorDelete) {
    throw new AppError(500, 'No se pudo eliminar el registro del archivo');
  }
}

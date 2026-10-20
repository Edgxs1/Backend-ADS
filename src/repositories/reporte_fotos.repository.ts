import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export const BUCKET_FOTOS_REPORTES = 'reportes_fotos';
export const MAX_FOTOS_POR_REPORTE = 6;

export interface FotoReporte {
  id_foto: string;
  id_reporte: string;
  url_foto: string;
}

export interface DatosFoto {
  buffer: Buffer;
  mimetype: string;
  nombreOriginal: string;
}

interface FotoSubida {
  ruta: string;
  url: string;
}

const COLUMNS = 'id_foto, id_reporte, url_foto';

function construirRuta(idReporte: string, nombreOriginal: string): string {
  const nombreLimpio = nombreOriginal.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${idReporte}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nombreLimpio}`;
}

export function extraerRutaStorage(url: string): string | null {
  const marcador = `/${BUCKET_FOTOS_REPORTES}/`;
  const indice = url.indexOf(marcador);

  if (indice === -1) {
    return null;
  }

  return decodeURIComponent(url.slice(indice + marcador.length));
}

export async function subirFotosStorage(
  idReporte: string,
  archivos: DatosFoto[],
): Promise<FotoSubida[]> {
  const subidas: FotoSubida[] = [];

  for (const archivo of archivos) {
    const ruta = construirRuta(idReporte, archivo.nombreOriginal);

    const { error } = await supabaseAdmin.storage
      .from(BUCKET_FOTOS_REPORTES)
      .upload(ruta, archivo.buffer, {
        contentType: archivo.mimetype,
        upsert: false,
      });

    if (error) {
      throw new AppError(500, 'No se pudo subir una de las fotos al almacenamiento');
    }

    const { data } = supabaseAdmin.storage
      .from(BUCKET_FOTOS_REPORTES)
      .getPublicUrl(ruta);

    subidas.push({ ruta, url: data.publicUrl });
  }

  return subidas;
}

export async function eliminarFotosStorage(rutas: string[]): Promise<void> {
  if (rutas.length === 0) {
    return;
  }

  const { error } = await supabaseAdmin.storage
    .from(BUCKET_FOTOS_REPORTES)
    .remove(rutas);

  if (error) {
    throw new AppError(500, 'No se pudieron eliminar las fotos del almacenamiento');
  }
}

export async function registrarFotosDB(
  idReporte: string,
  urls: string[],
): Promise<FotoReporte[]> {
  const { data, error } = await supabaseAdmin
    .from('reportes_fotos')
    .insert(urls.map((url) => ({ id_reporte: idReporte, url_foto: url })))
    .select(COLUMNS);

  if (error || !data) {
    throw new AppError(400, 'No se pudieron registrar las fotos en la base de datos');
  }

  return data as FotoReporte[];
}

export async function obtenerFotosPorReporte(idReporte: string): Promise<FotoReporte[]> {
  const { data, error } = await supabaseAdmin
    .from('reportes_fotos')
    .select(COLUMNS)
    .eq('id_reporte', idReporte);

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las fotos del reporte');
  }

  return (data ?? []) as FotoReporte[];
}

export async function contarFotosPorReporte(idReporte: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('reportes_fotos')
    .select('id_foto', { count: 'exact', head: true })
    .eq('id_reporte', idReporte);

  if (error) {
    throw new AppError(500, 'No se pudo contar las fotos del reporte');
  }

  return count ?? 0;
}

export async function obtenerFotoPorId(idFoto: string): Promise<FotoReporte | null> {
  const { data, error } = await supabaseAdmin
    .from('reportes_fotos')
    .select(COLUMNS)
    .eq('id_foto', idFoto)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'No se pudo obtener la foto');
  }

  return (data as FotoReporte | null) ?? null;
}

export async function eliminarFotoDB(idFoto: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('reportes_fotos')
    .delete()
    .eq('id_foto', idFoto);

  if (error) {
    throw new AppError(500, 'No se pudo eliminar el registro de la foto');
  }
}

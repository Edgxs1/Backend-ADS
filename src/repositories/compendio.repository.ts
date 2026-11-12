import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export interface FotoSeleccionada {
  id_foto: string;
  id_reporte: string;
  url_foto: string;
  fecha_reporte: string | null;
}

export interface CompendioMensual {
  id_compendio: string;
  id_obra: string;
  mes: number;
  anio: number;
  id_supervisor: string;
  fotografias: FotoSeleccionada[];
  created_at: string;
  updated_at: string;
}

export interface CompendioConSupervisor extends CompendioMensual {
  supervisor_correo: string | null;
}

export interface FotoReportePeriodo {
  id_foto: string;
  id_reporte: string;
  url_foto: string;
}

export interface ReporteConFotos {
  id_reporte: string;
  id_obra: string;
  id_creador: string;
  estado: string;
  created_at: string;
  actividades_realizadas: string | null;
  notas_relevantes: string | null;
  avance_general: number | null;
  fecha_estimada_conclusion: string | null;
  fotos: FotoReportePeriodo[];
}

interface CompendioRow extends CompendioMensual {
  usuarios: { correo: string } | { correo: string }[] | null;
}

interface ReporteFotosRow {
  id_reporte: string;
  id_obra: string;
  id_creador: string;
  estado: string;
  created_at: string;
  actividades_realizadas: string | null;
  notas_relevantes: string | null;
  avance_general: number | null;
  fecha_estimada_conclusion: string | null;
  reportes_fotos:
    | { id_foto: string; url_foto: string }[]
    | { id_foto: string; url_foto: string }
    | null;
}

const COMPENDIO_COLUMNS =
  'id_compendio, id_obra, mes, anio, id_supervisor, fotografias, created_at, updated_at';

const REPORTE_COLUMNS =
  'id_reporte, id_obra, id_creador, estado, created_at, actividades_realizadas, notas_relevantes, avance_general, fecha_estimada_conclusion';

function extraerCorreo(
  usuario: { correo: string } | { correo: string }[] | null,
): string | null {
  if (!usuario) {
    return null;
  }

  if (Array.isArray(usuario)) {
    return usuario[0]?.correo ?? null;
  }

  return usuario.correo ?? null;
}

function normalizarFotografias(valor: unknown): FotoSeleccionada[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.flatMap((item) => {
    if (typeof item !== 'object' || item === null) {
      return [];
    }

    const foto = item as Record<string, unknown>;

    if (typeof foto['url_foto'] !== 'string') {
      return [];
    }

    return [
      {
        id_foto: String(foto['id_foto'] ?? ''),
        id_reporte: String(foto['id_reporte'] ?? ''),
        url_foto: foto['url_foto'],
        fecha_reporte:
          typeof foto['fecha_reporte'] === 'string' ? foto['fecha_reporte'] : null,
      },
    ];
  });
}

function normalizarCompendio(row: CompendioRow): CompendioConSupervisor {
  return {
    id_compendio: String(row.id_compendio),
    id_obra: String(row.id_obra),
    mes: Number(row.mes),
    anio: Number(row.anio),
    id_supervisor: String(row.id_supervisor),
    fotografias: normalizarFotografias(
      row.fotografias,
    ),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    supervisor_correo: extraerCorreo(row.usuarios),
  };
}

export function rangoPeriodo(mes: number, anio: number): { inicio: string; fin: string } {
  const inicio = new Date(Date.UTC(anio, mes - 1, 1));
  const fin = new Date(Date.UTC(anio, mes, 1));
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}

export async function listarCompendiosPorObra(
  idObra: string,
): Promise<CompendioConSupervisor[]> {
  const { data, error } = await supabaseAdmin
    .from('compendios_mensuales')
    .select(`${COMPENDIO_COLUMNS}, usuarios (correo)`)
    .eq('id_obra', idObra)
    .order('anio', { ascending: false })
    .order('mes', { ascending: false });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener los compendios mensuales');
  }

  return ((data ?? []) as unknown as CompendioRow[]).map(normalizarCompendio);
}

export async function obtenerCompendioPorPeriodo(
  idObra: string,
  mes: number,
  anio: number,
): Promise<CompendioConSupervisor | null> {
  const { data, error } = await supabaseAdmin
    .from('compendios_mensuales')
    .select(`${COMPENDIO_COLUMNS}, usuarios (correo)`)
    .eq('id_obra', idObra)
    .eq('mes', mes)
    .eq('anio', anio)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'No se pudo obtener el compendio del periodo');
  }

  return data ? normalizarCompendio(data as unknown as CompendioRow) : null;
}

export async function guardarCompendio(
  idObra: string,
  idSupervisor: string,
  mes: number,
  anio: number,
  fotografias: FotoSeleccionada[],
): Promise<CompendioConSupervisor> {
  const { data, error } = await supabaseAdmin
    .from('compendios_mensuales')
    .upsert(
      {
        id_obra: idObra,
        id_supervisor: idSupervisor,
        mes,
        anio,
        fotografias: fotografias,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id_obra,mes,anio' },
    )
    .select(`${COMPENDIO_COLUMNS}, usuarios (correo)`)
    .single();

  if (error || !data) {
    throw new AppError(400, 'No se pudo guardar el compendio mensual');
  }

  return normalizarCompendio(data as unknown as CompendioRow);
}

export async function listarFotosReportesPorPeriodo(
  idObra: string,
  mes: number,
  anio: number,
): Promise<FotoSeleccionada[]> {
  const reportes = await listarReportesConFotosPorPeriodo(idObra, mes, anio);
  const fotos: FotoSeleccionada[] = [];

  for (const reporte of reportes) {
    for (const foto of reporte.fotos) {
      fotos.push({
        id_foto: foto.id_foto,
        id_reporte: foto.id_reporte,
        url_foto: foto.url_foto,
        fecha_reporte: reporte.created_at.slice(0, 10),
      });
    }
  }

  return fotos;
}

export async function listarReportesConFotosPorPeriodo(
  idObra: string,
  mes: number,
  anio: number,
): Promise<ReporteConFotos[]> {
  const { inicio, fin } = rangoPeriodo(mes, anio);

  const { data, error } = await supabaseAdmin
    .from('reportes_diarios')
    .select(`${REPORTE_COLUMNS}, reportes_fotos (id_foto, url_foto)`)
    .eq('id_obra', idObra)
    .gte('created_at', inicio)
    .lt('created_at', fin)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener los reportes del periodo');
  }

  return ((data ?? []) as unknown as ReporteFotosRow[]).map((row) => {
    const fotos = Array.isArray(row.reportes_fotos)
      ? row.reportes_fotos
      : row.reportes_fotos
        ? [row.reportes_fotos]
        : [];

    return {
      id_reporte: String(row.id_reporte),
      id_obra: String(row.id_obra),
      id_creador: String(row.id_creador),
      estado: String(row.estado),
      created_at: String(row.created_at),
      actividades_realizadas: row.actividades_realizadas,
      notas_relevantes: row.notas_relevantes,
      avance_general:
        row.avance_general === null || row.avance_general === undefined
          ? null
          : Number(row.avance_general),
      fecha_estimada_conclusion: row.fecha_estimada_conclusion,
      fotos: fotos.map((foto) => ({
        id_foto: String(foto.id_foto),
        id_reporte: String(row.id_reporte),
        url_foto: String(foto.url_foto),
      })),
    };
  });
}

import {
  guardarCompendio,
  listarCompendiosPorObra,
  listarFotosReportesPorPeriodo,
  listarReportesConFotosPorPeriodo,
  obtenerCompendioPorPeriodo,
  type CompendioConSupervisor,
  type FotoSeleccionada,
  type ReporteConFotos,
} from '../repositories/compendio.repository.js';
import {
  MAX_FOTOS_COMPENDIO,
  type CrearCompendioDto,
} from '../schemas/compendio.schemas.js';
import { AppError } from '../shared/errors/AppError.js';

export interface PeriodoCompendio {
  mes: number;
  anio: number;
  compendio: CompendioConSupervisor | null;
  reportes: ReporteConFotos[];
}

export async function listarCompendios(
  idObra: string,
): Promise<CompendioConSupervisor[]> {
  return listarCompendiosPorObra(idObra);
}

export async function listarFotosReportesPeriodo(
  idObra: string,
  mes: number,
  anio: number,
): Promise<FotoSeleccionada[]> {
  return listarFotosReportesPorPeriodo(idObra, mes, anio);
}

export async function obtenerPeriodoCompendio(
  idObra: string,
  mes: number,
  anio: number,
): Promise<PeriodoCompendio> {
  const [compendio, reportes] = await Promise.all([
    obtenerCompendioPorPeriodo(idObra, mes, anio),
    listarReportesConFotosPorPeriodo(idObra, mes, anio),
  ]);

  return { mes, anio, compendio, reportes };
}

export async function generarCompendio(
  idObra: string,
  idSupervisor: string,
  input: CrearCompendioDto,
): Promise<CompendioConSupervisor> {
  const idsUnicos = [...new Set(input.fotografias.map((foto) => foto.id_foto))];

  if (idsUnicos.length === 0) {
    throw new AppError(400, 'Selecciona al menos una fotografía');
  }

  if (idsUnicos.length > MAX_FOTOS_COMPENDIO) {
    throw new AppError(
      400,
      `El compendio admite un máximo de ${MAX_FOTOS_COMPENDIO} fotografías`,
    );
  }

  const reportes = await listarReportesConFotosPorPeriodo(
    idObra,
    input.mes,
    input.anio,
  );

  const fotosDisponibles = new Map<string, FotoSeleccionada>();

  for (const reporte of reportes) {
    for (const foto of reporte.fotos) {
      fotosDisponibles.set(foto.id_foto, {
        id_foto: foto.id_foto,
        id_reporte: foto.id_reporte,
        url_foto: foto.url_foto,
        fecha_reporte: reporte.created_at.slice(0, 10),
      });
    }
  }

  const seleccionadas: FotoSeleccionada[] = [];

  for (const idFoto of idsUnicos) {
    const foto = fotosDisponibles.get(idFoto);

    if (!foto) {
      throw new AppError(
        400,
        'Una o más fotografías no pertenecen a los reportes de ese periodo',
      );
    }

    seleccionadas.push(foto);
  }

  return guardarCompendio(
    idObra,
    idSupervisor,
    input.mes,
    input.anio,
    seleccionadas,
  );
}

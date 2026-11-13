import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

export interface Contratista {
  id_contratista: string;
  razon_social: string;
  rfc: string;
  registro_iva: string;
  registro_cmic: string;
  registro_gacm: string;
  representante_legal: string;
  cargo_representante: string;
  telefono_representante: string;
}

export interface Contrato {
  id_contrato: string;
  id_obra: string;
  id_contratista: string;
  numero_contrato: string;
  fecha_contrato: string;
  lugar_obra: string;
  periodo_ejecucion_inicio: string;
  periodo_ejecucion_fin: string;
  importe_contrato: number;
}

export interface ContratoConContratista extends Contrato {
  contratista: Contratista;
}

export interface ContratistaInput {
  razon_social: string;
  rfc: string;
  registro_iva: string;
  registro_cmic: string;
  registro_gacm: string;
  representante_legal: string;
  cargo_representante: string;
  telefono_representante: string;
}

export interface RegistrarContratoInput {
  numero_contrato: string;
  fecha_contrato: string;
  lugar_obra: string;
  periodo_ejecucion_inicio: string;
  periodo_ejecucion_fin: string;
  importe_contrato: number;
  contratista: ContratistaInput;
}

interface ContratoRow extends Contrato {
  contratistas: Contratista | Contratista[] | null;
}

export interface ContratoAdenda {
  id: string;
  id_contrato: string;
  tipo: 'Tiempo' | 'Monto';
  nuevo_monto: number | null;
  nueva_fecha_termino: string | null;
  created_at: string;
}

const CONTRATO_COLUMNS =
  'id_contrato, id_obra, id_contratista, numero_contrato, fecha_contrato, lugar_obra, periodo_ejecucion_inicio, periodo_ejecucion_fin, importe_contrato';

const ADENDA_COLUMNS =
  'id, id_contrato, tipo, nuevo_monto, nueva_fecha_termino, created_at';

const CONTRATISTA_COLUMNS =
  'id_contratista, razon_social, rfc, registro_iva, registro_cmic, registro_gacm, representante_legal, cargo_representante, telefono_representante';

function extraerContratista(
  contratista: Contratista | Contratista[] | null,
): Contratista | null {
  if (!contratista) {
    return null;
  }

  if (Array.isArray(contratista)) {
    return contratista[0] ?? null;
  }

  return contratista;
}

export async function registrarContrato(
  idObra: string,
  idCreadoPor: string,
  input: RegistrarContratoInput,
): Promise<ContratoConContratista> {
  const { data: contratistaData, error: contratistaError } = await supabaseAdmin
    .from('contratistas')
    .insert({ ...input.contratista, id_creado_por: idCreadoPor })
    .select(CONTRATISTA_COLUMNS)
    .single();

  if (contratistaError || !contratistaData) {
    throw new AppError(400, 'No se pudo registrar el contratista');
  }

  const contratista = contratistaData as Contratista;

  const { data: contratoData, error: contratoError } = await supabaseAdmin
    .from('contratos')
    .insert({
      id_obra: idObra,
      id_creado_por: idCreadoPor,
      id_contratista: contratista.id_contratista,
      numero_contrato: input.numero_contrato,
      fecha_contrato: input.fecha_contrato,
      lugar_obra: input.lugar_obra,
      periodo_ejecucion_inicio: input.periodo_ejecucion_inicio,
      periodo_ejecucion_fin: input.periodo_ejecucion_fin,
      importe_contrato: input.importe_contrato,
    })
    .select(CONTRATO_COLUMNS)
    .single();

  if (contratoError || !contratoData) {
    await supabaseAdmin
      .from('contratistas')
      .delete()
      .eq('id_contratista', contratista.id_contratista);

    throw new AppError(400, 'No se pudo registrar el contrato');
  }

  return { ...(contratoData as Contrato), contratista };
}

export async function listarAdendasPorContrato(
  idContrato: string,
): Promise<ContratoAdenda[]> {
  const { data, error } = await supabaseAdmin
    .from('contrato_adendas')
    .select(ADENDA_COLUMNS)
    .eq('id_contrato', idContrato)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(500, 'No se pudieron obtener las adendas del contrato');
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    id_contrato: String(row.id_contrato),
    tipo: row.tipo === 'Tiempo' ? 'Tiempo' : 'Monto',
    nuevo_monto:
      row.nuevo_monto === null || row.nuevo_monto === undefined
        ? null
        : Number(row.nuevo_monto),
    nueva_fecha_termino:
      row.nueva_fecha_termino === null ||
      row.nueva_fecha_termino === undefined
        ? null
        : String(row.nueva_fecha_termino),
    created_at: String(row.created_at),
  }));
}

export function sumarAdendasMonto(
  importeOriginal: number,
  adendas: ContratoAdenda[],
): number {
  const adendasMonto = adendas.reduce(
    (total, adenda) =>
      adenda.tipo === 'Monto' && adenda.nuevo_monto !== null
        ? total + adenda.nuevo_monto
        : total,
    0,
  );

  return Number((importeOriginal + adendasMonto).toFixed(2));
}

export function fechaFinConAdendas(
  fechaOriginal: string | null,
  adendas: ContratoAdenda[],
): string | null {
  let vigente = fechaOriginal;

  for (const adenda of adendas) {
    if (adenda.tipo !== 'Tiempo' || !adenda.nueva_fecha_termino) {
      continue;
    }

    if (!vigente || adenda.nueva_fecha_termino > vigente) {
      vigente = adenda.nueva_fecha_termino;
    }
  }

  return vigente;
}

export async function obtenerContratoPorObra(
  idObra: string,
): Promise<ContratoConContratista | null> {
  const { data, error } = await supabaseAdmin
    .from('contratos')
    .select(`${CONTRATO_COLUMNS}, contratistas (${CONTRATISTA_COLUMNS})`)
    .eq('id_obra', idObra)
    .order('fecha_contrato', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'No se pudo obtener el contrato');
  }

  if (!data) {
    return null;
  }

  const { contratistas, ...contrato } = data as unknown as ContratoRow;
  const contratista = extraerContratista(contratistas);

  if (!contratista) {
    throw new AppError(500, 'El contrato no tiene un contratista asociado');
  }

  return { ...contrato, contratista };
}

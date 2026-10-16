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

const CONTRATO_COLUMNS =
  'id_contrato, id_obra, id_contratista, numero_contrato, fecha_contrato, lugar_obra, periodo_ejecucion_inicio, periodo_ejecucion_fin, importe_contrato';

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
  input: RegistrarContratoInput,
): Promise<ContratoConContratista> {
  const { data: contratistaData, error: contratistaError } = await supabaseAdmin
    .from('contratistas')
    .insert(input.contratista)
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

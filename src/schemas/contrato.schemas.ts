import { z } from 'zod';

export const contratistaSchema = z.object({
  razon_social: z.string().trim().min(1).max(200),
  rfc: z.string().trim().min(1).max(13),
  registro_iva: z.string().trim().min(1).max(50),
  registro_cmic: z.string().trim().min(1).max(50),
  registro_gacm: z.string().trim().min(1).max(50),
  representante_legal: z.string().trim().min(1).max(200),
  cargo_representante: z.string().trim().min(1).max(150),
  telefono_representante: z.string().trim().min(1).max(30),
});

export const registrarContratoSchema = z.object({
  numero_contrato: z.string().trim().min(1).max(100),
  fecha_contrato: z.iso.date(),
  lugar_obra: z.string().trim().min(1).max(200),
  periodo_ejecucion_inicio: z.iso.date(),
  periodo_ejecucion_fin: z.iso.date(),
  importe_contrato: z.number().positive(),
  contratista: contratistaSchema,
});

export const contratoObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export type ContratistaDto = z.infer<typeof contratistaSchema>;
export type RegistrarContratoDto = z.infer<typeof registrarContratoSchema>;

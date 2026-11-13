import { z } from 'zod';

export const CARPETAS_REPOSITORIO = [
  'Contrato y Anexos',
  'Documentos del Contratista',
  'Documentos de Supervisión',
  'Actas y Cierres',
] as const;

export const categoriaCarpetaSchema = z.enum(CARPETAS_REPOSITORIO);

export const subirArchivoSchema = z.object({
  tipo_documento: z.string().trim().min(1).max(100),
  categoria_carpeta: categoriaCarpetaSchema,
});

export const archivoObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export const archivoParamsSchema = z.object({
  id_obra: z.uuid(),
  id_archivo: z.uuid(),
});

export type SubirArchivoDto = z.infer<typeof subirArchivoSchema>;

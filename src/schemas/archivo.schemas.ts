import { z } from 'zod';

export const subirArchivoSchema = z.object({
  tipo_documento: z.string().trim().min(1).max(100),
});

export const archivoObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export const archivoParamsSchema = z.object({
  id_obra: z.uuid(),
  id_archivo: z.uuid(),
});

export type SubirArchivoDto = z.infer<typeof subirArchivoSchema>;

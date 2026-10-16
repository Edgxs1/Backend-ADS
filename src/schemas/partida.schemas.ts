import { z } from 'zod';

export const crearPartidaSchema = z.object({
  clave: z.string().trim().min(1).max(100),
  descripcion: z.string().trim().min(1).max(500),
});

export const partidaObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export type CrearPartidaDto = z.infer<typeof crearPartidaSchema>;

import { z } from 'zod';

export const crearPartidaSchema = z.object({
  clave: z.string().trim().min(1).max(100),
  descripcion: z.string().trim().min(1).max(500),
});

export const actualizarPartidaSchema = crearPartidaSchema;

export const partidaObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export const partidaIdParamsSchema = z.object({
  id_obra: z.uuid(),
  id_partida: z.uuid(),
});

export type CrearPartidaDto = z.infer<typeof crearPartidaSchema>;
export type ActualizarPartidaDto = z.infer<typeof actualizarPartidaSchema>;

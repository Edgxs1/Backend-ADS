import { z } from 'zod';

export const ESTADOS_NOTA = ['Abierta', 'Firmada'] as const;

export const crearNotaSchema = z.object({
  texto: z.string().trim().min(5).max(2000),
});

export const editarNotaSchema = z.object({
  texto: z.string().trim().min(5).max(2000),
});

export const cambiarEstadoNotaSchema = z.object({
  estado: z.enum(ESTADOS_NOTA, 'Estado inválido'),
});

export const bitacoraObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export const notaParamsSchema = z.object({
  id_obra: z.uuid(),
  id_nota: z.uuid(),
});

export const firmarNotaSchema = z.object({
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type CrearNotaDto = z.infer<typeof crearNotaSchema>;
export type EditarNotaDto = z.infer<typeof editarNotaSchema>;
export type CambiarEstadoNotaDto = z.infer<typeof cambiarEstadoNotaSchema>;
export type FirmarNotaDto = z.infer<typeof firmarNotaSchema>;
export type EstadoNota = (typeof ESTADOS_NOTA)[number];

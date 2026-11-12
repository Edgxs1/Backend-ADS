import { z } from 'zod';

export const TIPOS_PENDIENTE = ['estimacion', 'bitacora', 'reporte'] as const;

export const tareaPendienteSchema = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_PENDIENTE),
  id_obra: z.string(),
  obra: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  estado: z.string(),
  fecha: z.string().nullable(),
  ruta: z.string(),
});

export const pendientesResponseSchema = z.array(tareaPendienteSchema);

export type TipoPendiente = (typeof TIPOS_PENDIENTE)[number];
export type TareaPendiente = z.infer<typeof tareaPendienteSchema>;

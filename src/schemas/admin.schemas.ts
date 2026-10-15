import { z } from 'zod';

export const crearUsuarioSchema = z.object({
  email: z.email(),
});

export const asignarSchema = z.object({
  id_usuario: z.uuid(),
  id_obra: z.uuid(),
});

export const actualizarRolSchema = z.object({
  id_rol: z.number().int().min(1).max(5),
});

export type CrearUsuarioDto = z.infer<typeof crearUsuarioSchema>;
export type AsignarDto = z.infer<typeof asignarSchema>;
export type ActualizarRolDto = z.infer<typeof actualizarRolSchema>;

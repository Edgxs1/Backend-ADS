import { z } from 'zod';
import { ROLES } from '../shared/types/roles.js';
import { passwordSeguroSchema } from './password.schemas.js';

export const crearUsuarioSchema = z.object({
  email: z.email(),
  id_rol: z.number().int().min(1).max(5).optional(),
  password: passwordSeguroSchema.optional(),
});

export const listarUsuariosQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  rol: z.enum(ROLES).optional(),
});

export const asignarSchema = z.object({
  id_usuario: z.uuid(),
  id_obra: z.uuid(),
});

export const actualizarRolSchema = z.object({
  id_rol: z.number().int().min(1).max(5),
});

export const idUsuarioParamsSchema = z.object({
  id_usuario: z.uuid(),
});

export const idObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export type CrearUsuarioDto = z.infer<typeof crearUsuarioSchema>;
export type ListarUsuariosQueryDto = z.infer<typeof listarUsuariosQuerySchema>;
export type AsignarDto = z.infer<typeof asignarSchema>;
export type ActualizarRolDto = z.infer<typeof actualizarRolSchema>;

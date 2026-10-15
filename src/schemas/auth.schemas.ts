import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const recuperarSchema = z.object({
  email: z.email(),
});

export const restablecerSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RecuperarDto = z.infer<typeof recuperarSchema>;
export type RestablecerDto = z.infer<typeof restablecerSchema>;

import { z } from 'zod';
import { passwordSeguroSchema } from './password.schemas.js';

export const RFC_REGEX =
  /^([A-ZÑ&]{3,4})\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/i;

export const actualizarPerfilSchema = z
  .object({
    rfc: z
      .string()
      .trim()
      .min(12, 'El RFC debe tener 12 o 13 caracteres')
      .max(13, 'El RFC debe tener 12 o 13 caracteres')
      .regex(RFC_REGEX, 'El RFC no tiene un formato válido')
      .optional(),
    telefono: z
      .string()
      .trim()
      .min(7, 'El teléfono debe tener al menos 7 dígitos')
      .max(20, 'El teléfono es demasiado largo')
      .regex(/^[0-9+()\s-]+$/, 'El teléfono contiene caracteres inválidos')
      .optional(),
    cedula_profesional: z
      .string()
      .trim()
      .min(4, 'La cédula profesional es demasiado corta')
      .max(30, 'La cédula profesional es demasiado larga')
      .regex(/^[A-Za-z0-9-]+$/, 'La cédula profesional contiene caracteres inválidos')
      .optional(),
  })
  .refine(
    (data) =>
      data.rfc !== undefined ||
      data.telefono !== undefined ||
      data.cedula_profesional !== undefined,
    { message: 'No hay campos para actualizar' },
  );

export const cambiarPasswordSchema = z
  .object({
    nueva_contrasena: passwordSeguroSchema,
    confirmar_contrasena: passwordSeguroSchema,
  })
  .refine((data) => data.nueva_contrasena === data.confirmar_contrasena, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar_contrasena'],
  });

export const estadoUsuarioSchema = z.object({
  activo: z.boolean(),
});

export type ActualizarPerfilDto = z.infer<typeof actualizarPerfilSchema>;
export type CambiarPasswordDto = z.infer<typeof cambiarPasswordSchema>;
export type EstadoUsuarioDto = z.infer<typeof estadoUsuarioSchema>;

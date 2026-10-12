export const ROLES = [
  'Administrador',
  'Superintendente',
  'Supervisor',
  'Residente',
  'Directivo',
] as const;

export type Rol = (typeof ROLES)[number];

export const ROLES = [
  'Administrador',
  'Superintendente',
  'Supervisor',
  'Residente',
  'Directivo',
] as const;

export type Rol = (typeof ROLES)[number];

export const ROL_ID: Record<Rol, number> = {
  Administrador: 1,
  Superintendente: 2,
  Supervisor: 3,
  Residente: 4,
  Directivo: 5,
};

export const ROL_BY_ID: Record<number, Rol> = {
  1: 'Administrador',
  2: 'Superintendente',
  3: 'Supervisor',
  4: 'Residente',
  5: 'Directivo',
};

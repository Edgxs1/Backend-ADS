/**
 * Utilidades monetarias con precisión exacta.
 *
 * Todos los importes se manejan internamente en centavos enteros para
 * evitar errores de punto flotante. Solo se convierten a numero decimal
 * (con 2 decimales) al devolverlos al cliente.
 */

export function aCentavos(valor: number | string | null | undefined): number {
  if (valor === null || valor === undefined) {
    return 0;
  }

  const numero = typeof valor === 'string' ? Number(valor) : valor;

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return Math.round(numero * 100);
}

export function deCentavos(centavos: number): number {
  return Number((centavos / 100).toFixed(2));
}

/**
 * Aplica una tasa porcentual sobre un importe en centavos usando
 * aritmética entera (base y tasa enteras) para evitar el error de
 * representación binaria de los decimales.
 *
 * Ej: aplicarPorcentaje(10000, 16) -> 1600 centavos (16% de $100.00)
 */
export function aplicarPorcentaje(centavos: number, porcentajeEntero: number): number {
  return Math.round((centavos * porcentajeEntero) / 100);
}

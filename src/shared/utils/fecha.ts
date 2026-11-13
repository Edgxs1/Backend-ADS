const ZONA_HORARIA_MEXICO = 'America/Mexico_City';

/**
 * RF3.3 - Día del mes en la zona horaria de México.
 *
 * No usa `Date#getDate()` porque depende de la zona horaria del proceso; en un
 * servidor con TZ=UTC las 11:00 PM de México ya se considerarían el día
 * siguiente. `Intl.DateTimeFormat` fija la zona de forma explícita.
 */
export function diaActualEnMexico(fecha: Date = new Date()): number {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_MEXICO,
    day: '2-digit',
  }).formatToParts(fecha);

  const dia = Number(partes.find((parte) => parte.type === 'day')?.value);

  return Number.isFinite(dia) ? dia : fecha.getUTCDate();
}

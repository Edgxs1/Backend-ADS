import { createHmac, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';

/**
 * RF5.5 - Firmas criptográficas de la Bitácora.
 * El payload concatena obligatoriamente el RFC del usuario que firma,
 * junto con id_nota, timestamp y salt (FIRMA_SALT).
 */
export interface DatosFirmaBitacora {
  idNota: string;
  rfc: string;
}

export function generarFirmaBitacora(datos: DatosFirmaBitacora): string {
  const timestamp = new Date().toISOString();
  const nonce = randomBytes(16).toString('hex');

  const payload = [
    datos.rfc.trim().toUpperCase(),
    datos.idNota,
    timestamp,
    nonce,
  ].join('|');

  return createHmac('sha256', env.FIRMA_SALT).update(payload, 'utf8').digest('hex');
}

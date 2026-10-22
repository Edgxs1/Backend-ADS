import { createHmac, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';

/**
 * RF3.12.3 / RF3.12.7 - Firmas criptograficas de las estimaciones.
 *
 * Se usa HMAC-SHA-256 con el salt secreto de FIRMA_SALT como clave.
 * El payload incluye folio, id_estimacion, rol, timestamp y un nonce
 * aleatorio, de modo que cada firma es unica e irreversible.
 */
export interface DatosFirma {
  folio: string;
  idEstimacion: string;
  rol: string;
}

export function generarFirmaCriptografica(datos: DatosFirma): string {
  const timestamp = new Date().toISOString();
  const nonce = randomBytes(16).toString('hex');

  const payload = [
    datos.folio,
    datos.idEstimacion,
    datos.rol,
    timestamp,
    nonce,
  ].join('|');

  return createHmac('sha256', env.FIRMA_SALT).update(payload, 'utf8').digest('hex');
}

export interface FirmasEstimacion {
  firma_superintendente: string;
  firma_supervisor: string;
  firma_residente: string;
}

export function generarPaqueteFirmas(datos: Omit<DatosFirma, 'rol'>): FirmasEstimacion {
  return {
    firma_superintendente: generarFirmaCriptografica({
      ...datos,
      rol: 'Superintendente',
    }),
    firma_supervisor: generarFirmaCriptografica({ ...datos, rol: 'Supervisor' }),
    firma_residente: generarFirmaCriptografica({ ...datos, rol: 'Residente' }),
  };
}

import { createHash } from 'node:crypto';
import {
  ESTADO_ABIERTA,
  ESTADO_FIRMADA,
  firmarNotaRepo,
  obtenerNotaPorId,
  obtenerNotasPorObra as obtenerNotasRepo,
  actualizarTextoNota as actualizarTextoRepo,
  crearNota as crearNotaRepo,
  eliminarNota as eliminarNotaRepo,
  inyectarFirmaNota,
  actualizarEstadoNota,
} from '../repositories/bitacora.repository.js';
import type {
  NotaBitacora,
  NotaConCreador,
} from '../repositories/bitacora.repository.js';
import { findUsuarioPorId } from '../repositories/usuarios.repository.js';
import { AppError } from '../shared/errors/AppError.js';
import { ROL_BY_ID } from '../shared/types/roles.js';
import type { Rol } from '../shared/types/roles.js';
import type { CrearNotaDto, EditarNotaDto } from '../schemas/bitacora.schemas.js';
import { generarFirmaBitacora } from '../shared/crypto/firma-bitacora.js';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';

async function obtenerUsuarioYRol(idUsuario: string): Promise<{
  rol: Rol;
  rfc: string | null;
}> {
  const usuario = await findUsuarioPorId(idUsuario);
  const rol = usuario ? ROL_BY_ID[usuario.id_rol] : undefined;

  if (!rol) {
    throw new AppError(403, 'Acceso denegado: no se pudo determinar tu rol');
  }

  return { rol, rfc: usuario?.rfc ?? null };
}

function obtenerColumnaFirmaPorRol(
  rol: Rol,
): 'firma_superintendente' | 'firma_supervisor' | 'firma_residente' | null {
  if (rol === 'Superintendente') return 'firma_superintendente';
  if (rol === 'Supervisor') return 'firma_supervisor';
  if (rol === 'Residente') return 'firma_residente';
  return null;
}

/**
 * RF5.4 - Candado de edición/eliminación.
 * El creador original solo puede editar/eliminar su nota SI Y SOLO SI
 * las tres columnas de firmas están nulas (nadie ha firmado aún).
 * Si ya hay al menos una firma, se bloquea la edición (403).
 */
async function asegurarEditablePorFirmas(
  idNota: string,
  idUsuario: string,
  rol: Rol,
): Promise<NotaBitacora> {
  const nota = await obtenerNotaPorId(idNota);

  if (!nota) {
    throw new AppError(404, 'Nota de bitácora no encontrada');
  }

  if (nota.estado === ESTADO_FIRMADA) {
    throw new AppError(
      403,
      'Nota inmutable: una nota firmada no puede editarse ni eliminarse',
    );
  }

  const tieneAlgunaFirma = Boolean(
    nota.firma_superintendente ||
      nota.firma_supervisor ||
      nota.firma_residente,
  );

  if (tieneAlgunaFirma) {
    throw new AppError(
      403,
      'No se puede editar o eliminar: ya existe al menos una firma en la nota',
    );
  }

  if (rol === 'Administrador') {
    return nota;
  }

  if (nota.id_creador !== idUsuario) {
    throw new AppError(
      403,
      'Acceso denegado: solo el creador de la nota o un Administrador pueden modificarla',
    );
  }

  return nota;
}

export async function registrarNota(
  idObra: string,
  idCreador: string,
  input: CrearNotaDto,
): Promise<NotaBitacora> {
  return crearNotaRepo({
    id_obra: idObra,
    id_creador: idCreador,
    texto: input.texto,
  });
}

export async function listarNotasPorObra(
  idObra: string,
): Promise<NotaConCreador[]> {
  return obtenerNotasRepo(idObra);
}

export async function editarNota(
  idNota: string,
  idUsuario: string,
  input: EditarNotaDto,
): Promise<NotaBitacora> {
  const { rol } = await obtenerUsuarioYRol(idUsuario);
  await asegurarEditablePorFirmas(idNota, idUsuario, rol);
  return actualizarTextoRepo(idNota, input.texto);
}

export async function eliminarNota(idNota: string, idUsuario: string): Promise<void> {
  const { rol } = await obtenerUsuarioYRol(idUsuario);
  await asegurarEditablePorFirmas(idNota, idUsuario, rol);
  await eliminarNotaRepo(idNota);
}

export async function firmarNota(idNota: string, idUsuario: string): Promise<NotaBitacora> {
  const { rol, rfc } = await obtenerUsuarioYRol(idUsuario);
  const columnaFirma = obtenerColumnaFirmaPorRol(rol);

  if (!columnaFirma) {
    throw new AppError(
      403,
      'Acceso denegado: solo Superintendente, Supervisor o Residente pueden firmar notas',
    );
  }

  if (!rfc || rfc.trim().length === 0) {
    throw new AppError(403, 'No es posible firmar: el RFC del usuario no está registrado');
  }

  const nota = await obtenerNotaPorId(idNota);

  if (!nota) {
    throw new AppError(404, 'Nota de bitácora no encontrada');
  }

  if (nota.estado === ESTADO_FIRMADA) {
    throw new AppError(403, 'Nota inmutable: la nota ya se encuentra firmada');
  }

  if (nota[columnaFirma]) {
    throw new AppError(403, 'Ya existe una firma con este rol para la nota');
  }

  const hash = generarFirmaBitacora({ idNota, rfc });

  const notaFirmada = await firmarNotaRepo(idNota, columnaFirma, hash, nota.estado);

  if (
    notaFirmada.firma_superintendente &&
    notaFirmada.firma_supervisor &&
    notaFirmada.firma_residente &&
    notaFirmada.estado !== ESTADO_FIRMADA
  ) {
    return firmarNotaRepo(idNota, columnaFirma, hash, ESTADO_FIRMADA);
  }

  return notaFirmada;
}

export async function sellarNota(
  idNota: string,
  idUsuario: string,
  password: string,
): Promise<NotaBitacora> {
  const { rol, rfc } = await obtenerUsuarioYRol(idUsuario);
  const columnaFirma = obtenerColumnaFirmaPorRol(rol);

  if (!columnaFirma) {
    throw new AppError(
      403,
      'Acceso denegado: solo Superintendente, Supervisor o Residente pueden firmar notas',
    );
  }

  if (!rfc || rfc.trim().length === 0) {
    throw new AppError(403, 'No es posible firmar: el RFC del usuario no está registrado');
  }

  const usuario = await findUsuarioPorId(idUsuario);
  if (!usuario) {
    throw new AppError(401, 'No autorizado');
  }

  const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: usuario.correo,
    password,
  });

  if (signInError) {
    throw new AppError(401, 'Unauthorized');
  }

  const nota = await obtenerNotaPorId(idNota);

  if (!nota) {
    throw new AppError(404, 'Nota de bitácora no encontrada');
  }

  if (nota.estado === ESTADO_FIRMADA) {
    throw new AppError(403, 'Nota inmutable: la nota ya se encuentra firmada');
  }

  if (nota[columnaFirma]) {
    throw new AppError(403, 'Ya existe una firma con este rol para la nota');
  }

  const fechaHoraActual = new Date().toISOString();
  const hash = createHash('sha256')
    .update(`${rfc.trim().toUpperCase()}${idNota}${fechaHoraActual}${env.FIRMA_SALT}`)
    .digest('hex');

  const notaFirmada = await inyectarFirmaNota(idNota, columnaFirma, hash);

  if (notaFirmada.firma_superintendente && notaFirmada.firma_supervisor && notaFirmada.firma_residente) {
    await actualizarEstadoNota(idNota, ESTADO_FIRMADA);
    return { ...notaFirmada, estado: ESTADO_FIRMADA };
  }

  return notaFirmada;
}

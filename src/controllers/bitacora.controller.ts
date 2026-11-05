import type { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import type {
  CrearNotaDto,
  EditarNotaDto,
  FirmarNotaDto,
} from '../schemas/bitacora.schemas.js';
import {
  editarNota,
  eliminarNota,
  firmarNota as firmarNotaServicio,
  listarNotasPorObra,
  registrarNota,
  sellarNota,
} from '../services/bitacora.service.js';
import {
  ESTADO_COMPLETADA,
  ESTADO_PENDIENTE_FIRMA,
  obtenerNotaPorId,
} from '../repositories/bitacora.repository.js';
import { createAnonClient, supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

function requerirParam(req: Request, nombre: string): string {
  const raw = req.params[nombre];
  const valor = Array.isArray(raw) ? raw[0] : raw;

  if (!valor) {
    throw new AppError(400, `Falta el parámetro ${nombre}`);
  }

  return valor;
}

function requerirUsuario(req: Request): string {
  const user = req.user;

  if (!user) {
    throw new AppError(401, 'No autorizado: usuario no autenticado');
  }

  return user.id;
}

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idObra = requerirParam(req, 'id_obra');
    const idCreador = requerirUsuario(req);

    const nota = await registrarNota(idObra, idCreador, req.body as CrearNotaDto);

    res.status(201).json({ success: true, data: nota });
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notas = await listarNotasPorObra(requerirParam(req, 'id_obra'));

    res.status(200).json({ success: true, data: notas });
  } catch (error) {
    next(error);
  }
}

export async function editar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawId = req.params['id_nota'] ?? req.params['id'];
    const idNota = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!idNota) {
      throw new AppError(400, 'Falta el parámetro id_nota');
    }

    const idUsuario = requerirUsuario(req);

    const notaActual = await obtenerNotaPorId(idNota);

    if (!notaActual) {
      throw new AppError(404, 'Nota de bitácora no encontrada');
    }

    if (notaActual.id_creador !== idUsuario) {
      throw new AppError(403, 'Solo el creador puede editar esta nota');
    }

    if (
      notaActual.firma_superintendente ||
      notaActual.firma_supervisor ||
      notaActual.firma_residente
    ) {
      throw new AppError(403, 'La nota ya contiene firmas y no puede ser modificada');
    }

    const nota = await editarNota(idNota, idUsuario, req.body as EditarNotaDto);

    res.status(200).json({ success: true, data: nota });
  } catch (error) {
    next(error);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idNota = requerirParam(req, 'id_nota');
    const idUsuario = requerirUsuario(req);

    await eliminarNota(idNota, idUsuario);

    res.status(200).json({ success: true, data: { id_nota: idNota } });
  } catch (error) {
    next(error);
  }
}

export async function cambiarEstado(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const idNota = requerirParam(req, 'id_nota');
    const idUsuario = requerirUsuario(req);

    const nota = await firmarNotaServicio(idNota, idUsuario);

    res.status(200).json({ success: true, data: nota });
  } catch (error) {
    next(error);
  }
}

export const firmarNotaController = async (req: Request, res: Response) => {
  try {
    const idNota = req.params.id;
    const { password } = req.body;

    const userId = (req.user as any)?.id || (req.user as any)?.id_usuario;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { data: perfilUsuario, error: errorPerfil } = await supabaseAdmin
      .from('usuarios')
      .select('id_rol, rfc')
      .eq('id_usuario', userId)
      .maybeSingle();

    if (errorPerfil || !perfilUsuario) {
      return res.status(401).json({ success: false, message: 'Perfil de usuario no encontrado en la BD' });
    }

    const { data: nota, error: errorNota } = await supabaseAdmin
      .from('bitacora_notas')
      .select('*')
      .eq('id_nota', idNota)
      .maybeSingle();

    if (errorNota) {
      console.error('🚨 Error BD al buscar nota:', errorNota);
      return res.status(500).json({ success: false, message: 'Error interno al buscar nota' });
    }
    if (!nota) {
      return res.status(404).json({ success: false, message: 'La nota de bitácora no fue encontrada' });
    }

    let columnaFirma = '';
    const rolId = perfilUsuario.id_rol;

    if (rolId === 2) columnaFirma = 'firma_superintendente';
    else if (rolId === 3) columnaFirma = 'firma_supervisor';
    else if (rolId === 4) columnaFirma = 'firma_residente';
    else {
      return res.status(403).json({ success: false, message: 'Tu rol no está autorizado para firmar' });
    }

    if ((nota as any)[columnaFirma] !== null) {
      return res.status(400).json({ success: false, message: 'Ya has firmado esta nota previamente' });
    }

    const authClient = createAnonClient();
    const { error: signInError } = await authClient.auth.signInWithPassword({
      email: (req.user as any)?.email || '',
      password,
    });

    if (signInError && password) {
      const usuario = await supabaseAdmin
        .from('usuarios')
        .select('correo')
        .eq('id_usuario', userId)
        .maybeSingle();
      if (usuario.data?.correo) {
        const { error: signInError2 } = await authClient.auth.signInWithPassword({
          email: usuario.data.correo,
          password,
        });
        if (signInError2) {
          return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }
      } else {
        return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
      }
    }

    const rfc = perfilUsuario.rfc || 'XAXX010101000';
    const firmaString = `${rfc}-${idNota}-${new Date().toISOString()}-${process.env.FIRMA_SALT || 's4lT_s3gur0'}`;
    const hashGenerado = crypto.createHash('sha256').update(firmaString).digest('hex');

    const firmaSuperintendente =
      columnaFirma === 'firma_superintendente'
        ? hashGenerado
        : (nota as any).firma_superintendente;
    const firmaSupervisor =
      columnaFirma === 'firma_supervisor'
        ? hashGenerado
        : (nota as any).firma_supervisor;
    const firmaResidente =
      columnaFirma === 'firma_residente'
        ? hashGenerado
        : (nota as any).firma_residente;

    const nuevoEstado =
      firmaSuperintendente && firmaSupervisor && firmaResidente
        ? ESTADO_COMPLETADA
        : ESTADO_PENDIENTE_FIRMA;

    const { data: notaActualizada, error: errorUpdate } = await supabaseAdmin
      .from('bitacora_notas')
      .update({ [columnaFirma]: hashGenerado, estado: nuevoEstado })
      .eq('id_nota', idNota)
      .select('*');

    if (errorUpdate) {
      console.error('🚨 Error BD al guardar firma:', errorUpdate);
      return res.status(500).json({ success: false, message: 'Error guardando la firma' });
    }

    if (!notaActualizada || notaActualizada.length === 0) {
      console.error('🚨 El UPDATE afectó 0 filas. Revisa políticas de RLS para operaciones UPDATE en bitacora_notas.');
      return res.status(500).json({ success: false, message: 'No se pudo aplicar la firma (RLS)' });
    }

    return res.status(200).json({
      success: true,
      message: 'Nota firmada',
      data: notaActualizada[0],
    });
  } catch (error: any) {
    console.error('🚨 CRASH EVITADO EN FIRMAR NOTA:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

export async function firmar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawId = req.params['id'] ?? req.params['id_nota'];
    const idNotaStr = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!idNotaStr) {
      throw new AppError(400, 'Falta el parámetro id');
    }
    const idUsuario = requerirUsuario(req);
    const { password } = req.body as FirmarNotaDto;

    const idNotaFinal = Array.isArray(idNotaStr) ? idNotaStr[0] : idNotaStr;
    const nota = await sellarNota(String(idNotaFinal), idUsuario, password);

    res.status(200).json({ success: true, data: nota });
  } catch (error) {
    next(error);
  }
}

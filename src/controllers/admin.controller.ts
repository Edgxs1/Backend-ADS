import type { NextFunction, Request, Response } from 'express';
import type {
  ActualizarRolDto,
  AsignarDto,
  CrearUsuarioDto,
} from '../schemas/admin.schemas.js';
import {
  actualizarRolUsuario as actualizarRolUsuarioService,
  asignarUsuario as asignarUsuarioService,
  crearUsuario as crearUsuarioService,
  listarAsignacionesObra,
  listarUsuarios as listarUsuariosService,
} from '../services/admin.service.js';
import { AppError } from '../shared/errors/AppError.js';

export async function crearUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const usuario = await crearUsuarioService(req.body as CrearUsuarioDto);
    res.status(201).json({ success: true, data: usuario });
  } catch (error) {
    next(error);
  }
}

export async function listarUsuarios(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const usuarios = await listarUsuariosService();
    res.status(200).json({ success: true, data: usuarios });
  } catch (error) {
    next(error);
  }
}

export async function listarAsignaciones(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawId = req.params['id_obra'];
    const idObra = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!idObra) {
      throw new AppError(400, 'Falta el id de la obra');
    }

    const asignaciones = await listarAsignacionesObra(idObra);
    res.status(200).json({ success: true, data: asignaciones });
  } catch (error) {
    next(error);
  }
}

export async function asignar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const asignacion = await asignarUsuarioService(req.body as AsignarDto);
    res.status(201).json({ success: true, data: asignacion });
  } catch (error) {
    next(error);
  }
}

export async function actualizarRol(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id_usuario: idUsuario } = req.params;

    if (!idUsuario || Array.isArray(idUsuario)) {
      throw new AppError(400, 'Parámetro id_usuario inválido');
    }

    const usuario = await actualizarRolUsuarioService(
      idUsuario,
      req.body as ActualizarRolDto,
    );
    res.status(200).json({ success: true, data: usuario });
  } catch (error) {
    next(error);
  }
}

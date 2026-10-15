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
} from '../services/admin.service.js';
import { AppError } from '../shared/errors/AppError.js';

export async function crearUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as CrearUsuarioDto;
    const usuario = await crearUsuarioService(email);
    res.status(201).json({ success: true, data: usuario });
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

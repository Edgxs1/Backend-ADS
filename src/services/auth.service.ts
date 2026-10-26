import { env } from '../config/env.js';
import { createAnonClient, supabaseAdmin } from '../config/supabase.js';
import { findUsuarioPorId } from '../repositories/usuarios.repository.js';
import { AppError } from '../shared/errors/AppError.js';

export interface SesionAutenticada {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: { id: string; email: string | null };
}

export async function iniciarSesion(
  email: string,
  password: string,
): Promise<SesionAutenticada> {
  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    throw new AppError(401, 'Credenciales inválidas');
  }

  const { session } = data;

  const usuario = await findUsuarioPorId(session.user.id);

  if (usuario && usuario.activo === false) {
    throw new AppError(
      403,
      'Cuenta desactivada temporalmente. Contacte al administrador',
      { code: 'CUENTA_DESACTIVADA' },
    );
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: { id: session.user.id, email: session.user.email ?? null },
  };
}

export async function solicitarRestablecimiento(email: string): Promise<void> {
  const supabase = createAnonClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.FRONTEND_URL}/update-password`,
  });

  if (error) {
    throw new AppError(400, 'No se pudo enviar el enlace de restablecimiento');
  }
}

export async function restablecerPassword(
  idUsuario: string,
  password: string,
): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(idUsuario, {
    password,
  });

  if (error) {
    throw new AppError(400, 'No se pudo restablecer la contraseña');
  }
}

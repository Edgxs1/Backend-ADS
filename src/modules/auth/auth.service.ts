import { supabase } from '../../config/supabase.js';
import { AppError } from '../../shared/errors/AppError.js';

export async function enviarMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) {
    throw new AppError(400, 'No se pudo enviar el enlace de acceso');
  }
}

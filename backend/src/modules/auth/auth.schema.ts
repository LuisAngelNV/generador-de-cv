import { z } from 'zod';

// bcrypt only uses the first 72 bytes of the password.
const BCRYPT_MAX_BYTES = 72;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Introduce un email válido').max(254, 'El email es demasiado largo'));

const newPassword = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/\p{L}/u, 'La contraseña debe contener al menos una letra')
  .regex(/\d/, 'La contraseña debe contener al menos un número')
  .refine(
    (value) => Buffer.byteLength(value) <= BCRYPT_MAX_BYTES,
    'La contraseña es demasiado larga',
  );

export const registerSchema = z.object({
  email,
  password: newPassword,
  name: z.string().trim().min(1).max(100, 'El nombre es demasiado largo').optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Introduce tu contraseña').max(256),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

import { z } from 'zod';
import { httpUrl, optionalText, requiredText, uuidParam } from './cvs.fields';

export const CV_TEMPLATES = ['classic'] as const;
export const CV_LANGUAGES = ['es', 'en'] as const;

const link = z.object({
  label: requiredText(50),
  url: httpUrl,
});

export const cvParamsSchema = z.object({ cvId: uuidParam });

export const createCvSchema = z.object({
  title: requiredText(100),
  language: z.enum(CV_LANGUAGES).default('es'),
});

export const updateCvSchema = z
  .object({
    title: requiredText(100),
    templateId: z.enum(CV_TEMPLATES),
    language: z.enum(CV_LANGUAGES),
    fullName: z.string().trim().max(100, 'Máximo 100 caracteres'),
    headline: optionalText(150),
    summary: optionalText(2000),
    email: z
      .union([z.literal('').transform(() => null), z.email('Introduce un email válido').max(254)])
      .nullable()
      .optional(),
    phone: optionalText(30),
    location: optionalText(100),
    links: z.array(link).max(10, 'Máximo 10 enlaces'),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'No hay ningún campo que actualizar');

export type CreateCvInput = z.infer<typeof createCvSchema>;
export type UpdateCvInput = z.infer<typeof updateCvSchema>;

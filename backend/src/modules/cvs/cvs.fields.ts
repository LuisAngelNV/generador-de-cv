import { z } from 'zod';

/** Required text: trimmed and not empty. */
export function requiredText(max: number) {
  return z.string().trim().min(1, 'Este campo es obligatorio').max(max, `Máximo ${max} caracteres`);
}

/** Optional text: trimmed; an empty string is stored as null. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();
}

/** Only http(s) links, so nothing like `javascript:` ever reaches the CV template. */
export const httpUrl = z
  .url({
    protocol: /^https?$/,
    error: 'Introduce una URL válida que empiece por http:// o https://',
  })
  .max(500, 'Máximo 500 caracteres');

export const optionalHttpUrl = z
  .union([z.literal('').transform(() => null), httpUrl])
  .nullable()
  .optional();

/** A calendar date as YYYY-MM-DD, stored as a Date (Postgres `date` column). */
export const calendarDate = z.iso
  .date({ error: 'Usa el formato AAAA-MM-DD' })
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const optionalCalendarDate = calendarDate.nullable().optional();

interface DateRange {
  startDate?: Date | null;
  endDate?: Date | null;
}

/** endDate cannot be before startDate. Only checked when both are present. */
export function endAfterStart(range: DateRange): boolean {
  return !range.startDate || !range.endDate || range.endDate >= range.startDate;
}

export const endAfterStartError = {
  message: 'La fecha de fin no puede ser anterior a la de inicio',
  path: ['endDate'],
};

export const uuidParam = z.uuid('Identificador no válido');

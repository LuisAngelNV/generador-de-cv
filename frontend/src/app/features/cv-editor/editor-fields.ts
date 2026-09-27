import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { CvSectionKey, SectionItemInput } from '../../core/cvs/cv.models';

export type FieldType =
  'text' | 'email' | 'tel' | 'url' | 'textarea' | 'month' | 'checkbox' | 'select';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  maxLength?: number;
  options?: FieldOption[];
  placeholder?: string;
  hint?: string;
  /** Takes the whole row in the two-column layout. */
  wide?: boolean;
  /** Disabled (and cleared) while this checkbox field is checked. */
  disabledBy?: string;
}

export interface SectionConfig<K extends CvSectionKey = CvSectionKey> {
  key: K;
  title: string;
  addLabel: string;
  emptyText: string;
  fields: FieldConfig[];
  /** Start and end fields that must be in order. */
  dateRange?: { start: string; end: string };
  /** Short text that identifies an item when it is collapsed. */
  itemTitle: (values: FormValues) => string;
}

export type FormValue = string | boolean;
export type FormValues = Record<string, FormValue>;
export type ItemFormGroup = FormGroup<Record<string, FormControl<FormValue>>>;

const HTTP_URL = /^https?:\/\/\S+$/i;

export const SKILL_LEVELS: FieldOption[] = [
  { value: 'BEGINNER', label: 'Básico' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' },
  { value: 'EXPERT', label: 'Experto' },
];

export const LANGUAGE_LEVELS: FieldOption[] = [
  { value: 'A1', label: 'A1 · Principiante' },
  { value: 'A2', label: 'A2 · Elemental' },
  { value: 'B1', label: 'B1 · Intermedio' },
  { value: 'B2', label: 'B2 · Intermedio alto' },
  { value: 'C1', label: 'C1 · Avanzado' },
  { value: 'C2', label: 'C2 · Maestría' },
  { value: 'NATIVE', label: 'Nativo' },
];

const joinParts = (...parts: FormValue[]) =>
  parts.filter((part) => typeof part === 'string' && part.trim()).join(' · ');

export const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: 'experiences',
    title: 'Experiencia laboral',
    addLabel: 'Añadir experiencia',
    emptyText: 'Añade los puestos en los que has trabajado.',
    dateRange: { start: 'startDate', end: 'endDate' },
    itemTitle: (v) => joinParts(v['position'] ?? '', v['company'] ?? '') || 'Nueva experiencia',
    fields: [
      { key: 'position', label: 'Puesto', type: 'text', required: true, maxLength: 100 },
      { key: 'company', label: 'Empresa', type: 'text', required: true, maxLength: 100 },
      { key: 'location', label: 'Ubicación', type: 'text', maxLength: 100 },
      { key: 'isCurrent', label: 'Trabajo aquí actualmente', type: 'checkbox' },
      { key: 'startDate', label: 'Inicio', type: 'month', required: true },
      { key: 'endDate', label: 'Fin', type: 'month', disabledBy: 'isCurrent' },
      {
        key: 'description',
        label: 'Descripción',
        type: 'textarea',
        maxLength: 2000,
        wide: true,
        hint: 'Responsabilidades y logros principales.',
      },
    ],
  },
  {
    key: 'educations',
    title: 'Educación',
    addLabel: 'Añadir formación',
    emptyText: 'Añade tus estudios y formación.',
    dateRange: { start: 'startDate', end: 'endDate' },
    itemTitle: (v) => joinParts(v['degree'] ?? '', v['institution'] ?? '') || 'Nueva formación',
    fields: [
      { key: 'degree', label: 'Titulación', type: 'text', required: true, maxLength: 150 },
      { key: 'institution', label: 'Centro', type: 'text', required: true, maxLength: 150 },
      { key: 'fieldOfStudy', label: 'Especialidad', type: 'text', maxLength: 150 },
      { key: 'location', label: 'Ubicación', type: 'text', maxLength: 100 },
      { key: 'isCurrent', label: 'Estudio aquí actualmente', type: 'checkbox', wide: true },
      { key: 'startDate', label: 'Inicio', type: 'month' },
      { key: 'endDate', label: 'Fin', type: 'month', disabledBy: 'isCurrent' },
      { key: 'description', label: 'Descripción', type: 'textarea', maxLength: 2000, wide: true },
    ],
  },
  {
    key: 'skills',
    title: 'Habilidades',
    addLabel: 'Añadir habilidad',
    emptyText: 'Añade las tecnologías y competencias que dominas.',
    itemTitle: (v) => (v['name'] as string) || 'Nueva habilidad',
    fields: [
      { key: 'name', label: 'Habilidad', type: 'text', required: true, maxLength: 60 },
      { key: 'level', label: 'Nivel', type: 'select', options: SKILL_LEVELS },
    ],
  },
  {
    key: 'languages',
    title: 'Idiomas',
    addLabel: 'Añadir idioma',
    emptyText: 'Añade los idiomas que hablas.',
    itemTitle: (v) => (v['name'] as string) || 'Nuevo idioma',
    fields: [
      { key: 'name', label: 'Idioma', type: 'text', required: true, maxLength: 60 },
      {
        key: 'proficiency',
        label: 'Nivel',
        type: 'select',
        required: true,
        options: LANGUAGE_LEVELS,
      },
    ],
  },
  {
    key: 'projects',
    title: 'Proyectos',
    addLabel: 'Añadir proyecto',
    emptyText: 'Añade proyectos personales o profesionales destacados.',
    dateRange: { start: 'startDate', end: 'endDate' },
    itemTitle: (v) => (v['name'] as string) || 'Nuevo proyecto',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', required: true, maxLength: 100 },
      { key: 'role', label: 'Tu rol', type: 'text', maxLength: 100 },
      { key: 'url', label: 'Enlace', type: 'url', wide: true, placeholder: 'https://' },
      { key: 'startDate', label: 'Inicio', type: 'month' },
      { key: 'endDate', label: 'Fin', type: 'month' },
      { key: 'description', label: 'Descripción', type: 'textarea', maxLength: 2000, wide: true },
    ],
  },
  {
    key: 'certifications',
    title: 'Certificaciones',
    addLabel: 'Añadir certificación',
    emptyText: 'Añade cursos y certificaciones oficiales.',
    dateRange: { start: 'issueDate', end: 'expirationDate' },
    itemTitle: (v) => joinParts(v['name'] ?? '', v['issuer'] ?? '') || 'Nueva certificación',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', required: true, maxLength: 150 },
      { key: 'issuer', label: 'Entidad emisora', type: 'text', required: true, maxLength: 150 },
      { key: 'issueDate', label: 'Fecha de emisión', type: 'month' },
      { key: 'expirationDate', label: 'Fecha de caducidad', type: 'month' },
      { key: 'credentialId', label: 'ID de la credencial', type: 'text', maxLength: 100 },
      {
        key: 'credentialUrl',
        label: 'Enlace de la credencial',
        type: 'url',
        placeholder: 'https://',
      },
    ],
  },
];

/** ISO date from the API ("2020-01-15T00:00:00.000Z") → value of <input type="month"> ("2020-01"). */
export function toMonthInput(value: string | null | undefined): string {
  return value ? value.slice(0, 7) : '';
}

/** "2020-01" → "2020-01-01", the calendar date the API expects. */
export function fromMonthInput(value: string): string | null {
  return value ? `${value}-01` : null;
}

function fieldValidators(field: FieldConfig): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  if (field.required) validators.push(Validators.required, Validators.pattern(/\S/));
  if (field.maxLength) validators.push(Validators.maxLength(field.maxLength));
  if (field.type === 'email') validators.push(Validators.email);
  if (field.type === 'url') validators.push(Validators.pattern(HTTP_URL));
  return validators;
}

/** The end of a range cannot be before its start (month inputs compare as strings). */
export function dateRangeValidator(range: { start: string; end: string }): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(range.start)?.value as string | undefined;
    const end = group.get(range.end)?.value as string | undefined;
    return start && end && end < start ? { dateRange: true } : null;
  };
}

export function buildControl(field: FieldConfig, value: FormValue): FormControl<FormValue> {
  return new FormControl<FormValue>(value, {
    nonNullable: true,
    validators: fieldValidators(field),
  });
}

/** Form values for an item coming from the API (or empty values for a new item). */
export function toFormValues(
  config: SectionConfig,
  item: Record<string, unknown> | null,
): FormValues {
  const values: FormValues = {};
  for (const field of config.fields) {
    const raw = item?.[field.key];
    if (field.type === 'checkbox') values[field.key] = raw === true;
    else if (field.type === 'month') values[field.key] = toMonthInput(raw as string | null);
    else values[field.key] = typeof raw === 'string' ? raw : '';
  }
  return values;
}

export function buildItemForm(config: SectionConfig, values: FormValues): ItemFormGroup {
  const controls: Record<string, FormControl<FormValue>> = {};
  for (const field of config.fields) {
    controls[field.key] = buildControl(field, values[field.key] ?? '');
  }
  return new FormGroup(controls, {
    validators: config.dateRange ? dateRangeValidator(config.dateRange) : null,
  });
}

/** Payload for the API: empty optional values become null and months become dates. */
export function toItemPayload<K extends CvSectionKey>(
  config: SectionConfig<K>,
  values: FormValues,
): SectionItemInput<K> {
  const payload: Record<string, unknown> = {};
  for (const field of config.fields) {
    const value = values[field.key];
    if (field.type === 'checkbox') payload[field.key] = value === true;
    else if (field.type === 'month') payload[field.key] = fromMonthInput(value as string);
    else payload[field.key] = typeof value === 'string' && value.trim() ? value.trim() : null;
  }
  return payload as SectionItemInput<K>;
}

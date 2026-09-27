import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CvDetail, CvLanguage, CvProfile } from '../../../core/cvs/cv.models';
import { CvsService } from '../../../core/cvs/cvs.service';
import { getApiErrorMessage } from '../../../core/http/api-error';
import { Autosave, autosave } from '../autosave';
import { buildControl, FieldConfig, FormValue } from '../editor-fields';
import { FormField } from '../form-field/form-field';
import { SaveTracker } from '../save-tracker';

const MAX_LINKS = 10;

const PROFILE_FIELDS: FieldConfig[] = [
  { key: 'fullName', label: 'Nombre completo', type: 'text', required: true, maxLength: 100 },
  {
    key: 'headline',
    label: 'Titular',
    type: 'text',
    maxLength: 150,
    placeholder: 'Por ejemplo: Desarrolladora frontend',
  },
  { key: 'email', label: 'Email', type: 'email', maxLength: 254 },
  { key: 'phone', label: 'Teléfono', type: 'tel', maxLength: 30 },
  {
    key: 'location',
    label: 'Ubicación',
    type: 'text',
    maxLength: 100,
    placeholder: 'Ciudad, país',
  },
  {
    key: 'language',
    label: 'Idioma del CV',
    type: 'select',
    required: true,
    options: [
      { value: 'es', label: 'Español' },
      { value: 'en', label: 'Inglés' },
    ],
  },
  {
    key: 'summary',
    label: 'Resumen profesional',
    type: 'textarea',
    maxLength: 2000,
    wide: true,
    hint: 'Dos o tres frases sobre tu perfil y lo que buscas.',
  },
];

const LINK_LABEL: FieldConfig = {
  key: 'label',
  label: 'Nombre',
  type: 'text',
  required: true,
  maxLength: 50,
  placeholder: 'LinkedIn',
};
const LINK_URL: FieldConfig = {
  key: 'url',
  label: 'URL',
  type: 'url',
  required: true,
  placeholder: 'https://',
};

type LinkGroup = FormGroup<{ label: FormControl<FormValue>; url: FormControl<FormValue> }>;

let nextId = 0;

@Component({
  selector: 'app-profile-form',
  imports: [ReactiveFormsModule, FormField],
  templateUrl: './profile-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileForm implements OnInit {
  private readonly cvsService = inject(CvsService);
  private readonly tracker = inject(SaveTracker);
  private readonly destroyRef = inject(DestroyRef);

  readonly cv = input.required<CvDetail>();

  protected readonly fields = PROFILE_FIELDS;
  protected readonly linkLabel = LINK_LABEL;
  protected readonly linkUrl = LINK_URL;
  protected readonly maxLinks = MAX_LINKS;
  protected readonly idPrefix = `profile-${nextId++}`;
  protected readonly saveError = signal<string | null>(null);
  protected readonly linkCount = signal(0);

  protected form!: FormGroup<{
    fields: FormGroup<Record<string, FormControl<FormValue>>>;
    links: FormArray<LinkGroup>;
  }>;
  private autosaveHandle!: Autosave;

  ngOnInit(): void {
    const cv = this.cv();
    const fields: Record<string, FormControl<FormValue>> = {};
    for (const field of PROFILE_FIELDS) {
      const value = cv[field.key as keyof CvProfile];
      fields[field.key] = buildControl(field, typeof value === 'string' ? value : '');
    }
    this.form = new FormGroup({
      fields: new FormGroup(fields),
      links: new FormArray(cv.links.map((link) => this.buildLink(link.label, link.url))),
    });
    this.linkCount.set(cv.links.length);

    this.autosaveHandle = autosave({
      form: this.form,
      tracker: this.tracker,
      destroyRef: this.destroyRef,
      save: () => this.cvsService.update(this.cv().id, this.toPayload()),
      onError: (error) =>
        this.saveError.set(getApiErrorMessage(error, 'No se han podido guardar los cambios.')),
    });
    this.form.valueChanges.subscribe(() => this.saveError.set(null));
  }

  protected get fieldControls() {
    return this.form.controls.fields.controls;
  }

  protected get links(): FormArray<LinkGroup> {
    return this.form.controls.links;
  }

  protected addLink(): void {
    if (this.links.length >= MAX_LINKS) return;
    this.links.push(this.buildLink('', ''));
    this.linkCount.set(this.links.length);
  }

  protected removeLink(index: number): void {
    this.links.removeAt(index);
    this.linkCount.set(this.links.length);
  }

  protected retrySave(): void {
    this.autosaveHandle.saveNow();
  }

  private buildLink(label: string, url: string): LinkGroup {
    return new FormGroup({
      label: buildControl(LINK_LABEL, label),
      url: buildControl(LINK_URL, url),
    });
  }

  private toPayload(): Partial<CvProfile> {
    const values = this.form.controls.fields.getRawValue();
    const text = (key: string) => {
      const value = values[key];
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    };
    return {
      fullName: text('fullName') ?? '',
      headline: text('headline'),
      email: text('email'),
      phone: text('phone'),
      location: text('location'),
      summary: text('summary'),
      language: values['language'] as CvLanguage,
      links: this.links.getRawValue().map((link) => ({
        label: String(link.label).trim(),
        url: String(link.url).trim(),
      })),
    };
  }
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FieldConfig, FormValue } from '../editor-fields';

/** One labelled input of the editor, with its validation message. */
@Component({
  selector: 'app-form-field',
  imports: [ReactiveFormsModule],
  template: `
    @let f = field();
    @let c = control();
    @let invalid = c.touched && c.invalid;
    @if (f.type === 'checkbox') {
      <label class="flex items-center gap-2 py-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          class="size-4 rounded border-slate-300 accent-slate-900"
          [id]="inputId()"
          [formControl]="c"
        />
        {{ f.label }}
      </label>
    } @else {
      <label class="form-label" [for]="inputId()">
        {{ f.label }}
        @if (!f.required) {
          <span class="font-normal text-slate-500">(opcional)</span>
        }
      </label>
      @switch (f.type) {
        @case ('textarea') {
          <textarea
            class="form-input min-h-28"
            rows="4"
            [id]="inputId()"
            [formControl]="c"
            [attr.maxlength]="f.maxLength ?? null"
            [attr.aria-invalid]="invalid"
            [attr.aria-describedby]="describedBy()"
          ></textarea>
        }
        @case ('select') {
          <select
            class="form-input"
            [id]="inputId()"
            [formControl]="c"
            [attr.aria-invalid]="invalid"
            [attr.aria-describedby]="describedBy()"
          >
            <option value="">{{ f.required ? 'Selecciona una opción' : 'Sin especificar' }}</option>
            @for (option of f.options ?? []; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        }
        @default {
          <input
            class="form-input"
            [type]="f.type"
            [id]="inputId()"
            [formControl]="c"
            [placeholder]="f.placeholder ?? ''"
            [attr.maxlength]="f.maxLength ?? null"
            [attr.aria-invalid]="invalid"
            [attr.aria-describedby]="describedBy()"
          />
        }
      }
      @if (invalid) {
        <p class="form-error" [id]="inputId() + '-error'">{{ errorMessage() }}</p>
      } @else if (f.hint) {
        <p class="mt-1 text-sm text-slate-500" [id]="inputId() + '-hint'">{{ f.hint }}</p>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormField {
  readonly field = input.required<FieldConfig>();
  readonly control = input.required<FormControl<FormValue>>();
  /** Unique id prefix for this form, so labels point to the right input. */
  readonly idPrefix = input.required<string>();

  protected readonly inputId = computed(() => `${this.idPrefix()}-${this.field().key}`);
  protected readonly describedBy = computed(() =>
    this.field().hint ? `${this.inputId()}-hint` : `${this.inputId()}-error`,
  );

  protected errorMessage(): string {
    const control = this.control();
    const field = this.field();
    if (control.hasError('required') || control.hasError('pattern')) {
      if (field.type === 'url' && !control.hasError('required')) {
        return 'Introduce una URL que empiece por http:// o https://';
      }
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('maxlength')) return `Máximo ${field.maxLength} caracteres.`;
    if (control.hasError('email')) return 'Introduce un email válido.';
    return 'Revisa este campo.';
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HOME_AFTER_LOGIN } from '../../../core/auth/auth.guards';
import { AuthService } from '../../../core/auth/auth.service';
import { getApiError, getApiErrorMessage } from '../../../core/http/api-error';

// Same rules as the backend (auth.schema.ts).
const PASSWORD_VALIDATORS = [
  Validators.required,
  Validators.minLength(8),
  Validators.pattern(/\p{L}/u),
  Validators.pattern(/\d/),
];

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string;
  const confirmPassword = group.get('confirmPassword')?.value as string;
  return confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
}

type ServerField = 'name' | 'email' | 'password';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      name: ['', [Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', PASSWORD_VALIDATORS],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly passwordRules = [
    { key: 'length', label: 'Al menos 8 caracteres' },
    { key: 'letter', label: 'Al menos una letra' },
    { key: 'number', label: 'Al menos un número' },
  ] as const;

  protected passwordRuleFailed(rule: (typeof this.passwordRules)[number]['key']): boolean {
    const value = this.form.controls.password.value;
    if (rule === 'length') return value.length < 8;
    if (rule === 'letter') return !/\p{L}/u.test(value);
    return !/\d/.test(value);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.serverError.set(null);

    const { name, email, password } = this.form.getRawValue();
    this.auth.register({ email, password, name: name.trim() || undefined }).subscribe({
      next: () => void this.router.navigateByUrl(HOME_AFTER_LOGIN),
      error: (error: unknown) => {
        this.showServerError(error);
        this.submitting.set(false);
      },
    });
  }

  /** Shows field errors next to their inputs and anything else at the top of the form. */
  private showServerError(error: unknown): void {
    const apiError = getApiError(error);

    if (apiError?.code === 'EMAIL_IN_USE') {
      this.form.controls.email.setErrors({ server: apiError.message });
      return;
    }

    const fieldErrors = (apiError?.details ?? []).filter(
      (detail): detail is { path: ServerField; message: string } =>
        detail.path in this.form.controls,
    );
    for (const { path, message } of fieldErrors) {
      this.form.controls[path].setErrors({ server: message });
    }
    if (fieldErrors.length === 0) {
      this.serverError.set(getApiErrorMessage(error, 'No se ha podido crear la cuenta.'));
    }
  }
}

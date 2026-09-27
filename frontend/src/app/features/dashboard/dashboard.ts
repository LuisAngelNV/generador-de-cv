import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { CvSummary, toCvSummary } from '../../core/cvs/cv.models';
import { CvsService } from '../../core/cvs/cvs.service';
import { getApiErrorMessage } from '../../core/http/api-error';
import { Dialog } from '../../shared/ui/dialog/dialog';
import { CvCard } from './cv-card/cv-card';

type TitleDialogState = { mode: 'create' } | { mode: 'rename'; cv: CvSummary };

@Component({
  selector: 'app-dashboard',
  imports: [ReactiveFormsModule, CvCard, Dialog],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly auth = inject(AuthService);
  private readonly cvsService = inject(CvsService);

  protected readonly user = this.auth.user;
  protected readonly loggingOut = signal(false);

  protected readonly cvs = signal<CvSummary[]>([]);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  /** CV with an action in progress; its buttons are disabled meanwhile. */
  protected readonly busyCvId = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly titleDialog = signal<TitleDialogState | null>(null);
  protected readonly cvToDelete = signal<CvSummary | null>(null);
  protected readonly dialogSaving = signal(false);
  protected readonly dialogError = signal<string | null>(null);
  protected readonly titleForm = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)],
    }),
  });
  protected readonly titleControl = this.titleForm.controls.title;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.status.set('loading');
    this.cvsService.list().subscribe({
      next: (cvs) => {
        this.cvs.set(cvs);
        this.status.set('ready');
      },
      error: () => this.status.set('error'),
    });
  }

  protected logout(): void {
    this.loggingOut.set(true);
    this.auth.logout().subscribe();
  }

  protected openCreate(): void {
    this.openTitleDialog({ mode: 'create' }, '');
  }

  protected openRename(cv: CvSummary): void {
    this.openTitleDialog({ mode: 'rename', cv }, cv.title);
  }

  protected closeTitleDialog(): void {
    this.titleDialog.set(null);
  }

  protected submitTitle(): void {
    const state = this.titleDialog();
    if (!state || this.titleControl.invalid) {
      this.titleControl.markAsTouched();
      return;
    }

    const title = this.titleControl.value.trim();
    const request =
      state.mode === 'create'
        ? this.cvsService.create({ title })
        : this.cvsService.update(state.cv.id, { title });

    this.dialogSaving.set(true);
    this.dialogError.set(null);
    request.subscribe({
      next: (cv) => {
        // The updated CV is now the most recently modified one.
        this.putFirst(toCvSummary(cv));
        this.dialogSaving.set(false);
        this.titleDialog.set(null);
      },
      error: (error: unknown) => {
        this.dialogError.set(getApiErrorMessage(error, 'No se ha podido guardar el CV.'));
        this.dialogSaving.set(false);
      },
    });
  }

  protected duplicate(cv: CvSummary): void {
    this.runAction(cv, () =>
      this.cvsService.duplicate(cv.id).subscribe({
        next: (copy) => {
          this.putFirst(toCvSummary(copy));
          this.busyCvId.set(null);
        },
        error: (error: unknown) => this.failAction(error, 'No se ha podido duplicar el CV.'),
      }),
    );
  }

  protected askDelete(cv: CvSummary): void {
    this.dialogError.set(null);
    this.cvToDelete.set(cv);
  }

  protected closeDeleteDialog(): void {
    this.cvToDelete.set(null);
  }

  protected confirmDelete(): void {
    const cv = this.cvToDelete();
    if (!cv) return;

    this.dialogSaving.set(true);
    this.dialogError.set(null);
    this.cvsService.delete(cv.id).subscribe({
      next: () => {
        this.cvs.update((cvs) => cvs.filter((item) => item.id !== cv.id));
        this.dialogSaving.set(false);
        this.cvToDelete.set(null);
      },
      error: (error: unknown) => {
        this.dialogError.set(getApiErrorMessage(error, 'No se ha podido eliminar el CV.'));
        this.dialogSaving.set(false);
      },
    });
  }

  private openTitleDialog(state: TitleDialogState, title: string): void {
    this.titleControl.reset(title);
    this.dialogError.set(null);
    this.titleDialog.set(state);
  }

  private runAction(cv: CvSummary, action: () => void): void {
    this.actionError.set(null);
    this.busyCvId.set(cv.id);
    action();
  }

  private failAction(error: unknown, fallback: string): void {
    this.actionError.set(getApiErrorMessage(error, fallback));
    this.busyCvId.set(null);
  }

  private putFirst(cv: CvSummary): void {
    this.cvs.update((cvs) => [cv, ...cvs.filter((item) => item.id !== cv.id)]);
  }
}

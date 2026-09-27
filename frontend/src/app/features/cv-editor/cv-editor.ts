import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { filter, first, map, merge, switchMap, timer } from 'rxjs';
import { CvDetail } from '../../core/cvs/cv.models';
import { CvsService } from '../../core/cvs/cvs.service';
import { getApiErrorMessage } from '../../core/http/api-error';
import { CvPreview } from './cv-preview/cv-preview';
import { SECTION_CONFIGS } from './editor-fields';
import { LeaveGuarded } from './leave-editor.guard';
import { ProfileForm } from './profile-form/profile-form';
import { SaveStatus, SaveTracker } from './save-tracker';
import { SectionEditor } from './section-editor/section-editor';

const STATUS_LABELS: Record<SaveStatus, string> = {
  saved: 'Todos los cambios guardados',
  saving: 'Guardando…',
  unsaved: 'Cambios sin guardar',
  error: 'Error al guardar',
};

/** How long a download waits for pending autosaves before printing what is saved. */
const MAX_WAIT_FOR_SAVE_MS = 3000;

type EditorTab = 'edit' | 'preview';

@Component({
  selector: 'app-cv-editor',
  imports: [RouterLink, ProfileForm, SectionEditor, CvPreview],
  templateUrl: './cv-editor.html',
  providers: [SaveTracker],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvEditor implements OnInit, LeaveGuarded {
  private readonly cvsService = inject(CvsService);
  protected readonly tracker = inject(SaveTracker);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  protected readonly cv = signal<CvDetail | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  protected readonly sections = SECTION_CONFIGS;
  protected readonly statusLabel = computed(() => STATUS_LABELS[this.tracker.status()]);

  protected readonly tabs: { id: EditorTab; label: string }[] = [
    { id: 'edit', label: 'Editar' },
    { id: 'preview', label: 'Vista previa' },
  ];
  protected readonly activeTab = signal<EditorTab>('edit');

  protected readonly downloading = signal(false);
  protected readonly downloadError = signal<string | null>(null);
  private readonly status$ = toObservable(this.tracker.status);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.status.set('loading');
    this.cvsService.get(this.id()).subscribe({
      next: (cv) => {
        this.cv.set(cv);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        const notFound =
          error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400);
        this.status.set(notFound ? 'not-found' : 'error');
      },
    });
  }

  /**
   * The PDF is printed from the saved CV, so pending autosaves are given a moment to finish
   * (invalid changes never will: after the wait, what is saved is downloaded).
   */
  protected downloadPdf(): void {
    const cv = this.cv();
    if (!cv || this.downloading()) return;

    this.downloading.set(true);
    this.downloadError.set(null);
    merge(this.status$.pipe(filter((status) => status === 'saved')), timer(MAX_WAIT_FOR_SAVE_MS))
      .pipe(
        first(),
        switchMap(() => this.cvsService.downloadPdf(cv.id)),
        map(({ blob, filename }) => saveFile(blob, filename)),
      )
      .subscribe({
        next: () => this.downloading.set(false),
        error: (error: unknown) => {
          this.downloadError.set(
            getApiErrorMessage(error, 'No se ha podido generar el PDF. Inténtalo de nuevo.'),
          );
          this.downloading.set(false);
        },
      });
  }

  /** Items of a section, typed loosely for the generic section editor. */
  protected itemsOf(cv: CvDetail, key: (typeof SECTION_CONFIGS)[number]['key']): readonly object[] {
    return cv[key];
  }

  /** Changes that would be lost by closing the page: pending autosaves included. */
  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.tracker.hasPendingChanges()) {
      event.preventDefault();
    }
  }

  /** Used by the route guard: valid changes are saved on leaving, invalid ones are not. */
  canLeave(): boolean {
    return !this.tracker.hasUnsavableChanges();
  }
}

function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

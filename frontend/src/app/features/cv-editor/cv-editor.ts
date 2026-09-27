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
import { RouterLink } from '@angular/router';
import { LeaveGuarded } from './leave-editor.guard';
import { CvDetail } from '../../core/cvs/cv.models';
import { CvsService } from '../../core/cvs/cvs.service';
import { SECTION_CONFIGS } from './editor-fields';
import { ProfileForm } from './profile-form/profile-form';
import { SaveStatus, SaveTracker } from './save-tracker';
import { SectionEditor } from './section-editor/section-editor';

const STATUS_LABELS: Record<SaveStatus, string> = {
  saved: 'Todos los cambios guardados',
  saving: 'Guardando…',
  unsaved: 'Cambios sin guardar',
  error: 'Error al guardar',
};

@Component({
  selector: 'app-cv-editor',
  imports: [RouterLink, ProfileForm, SectionEditor],
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

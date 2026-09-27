import { computed, Injectable, signal } from '@angular/core';
import { catchError, finalize, Observable, throwError } from 'rxjs';
import { getApiErrorMessage } from '../../core/http/api-error';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

/** Immutable set helpers, so signals notice the change. */
const withItem = (set: ReadonlySet<object>, item: object) =>
  set.has(item) ? set : new Set(set).add(item);
const withoutItem = (set: ReadonlySet<object>, item: object) => {
  if (!set.has(item)) return set;
  const next = new Set(set);
  next.delete(item);
  return next;
};

/**
 * Aggregated autosave state of the editor. Every form reports its unsaved and invalid
 * changes and routes its requests through `track`, so the header can show one status.
 * Provided by the editor component, so it lives as long as the editor.
 */
@Injectable()
export class SaveTracker {
  private readonly inFlight = signal(0);
  private readonly dirty = signal<ReadonlySet<object>>(new Set());
  private readonly invalid = signal<ReadonlySet<object>>(new Set());
  private readonly error = signal<string | null>(null);

  readonly lastError = this.error.asReadonly();
  readonly status = computed<SaveStatus>(() => {
    if (this.inFlight() > 0) return 'saving';
    if (this.error()) return 'error';
    return this.dirty().size > 0 ? 'unsaved' : 'saved';
  });
  /** Changes that closing the page right now would lose (including pending autosaves). */
  readonly hasPendingChanges = computed(() => this.status() !== 'saved');
  /** Changes that will not be saved automatically: invalid forms or a failed save. */
  readonly hasUnsavableChanges = computed(() => this.invalid().size > 0 || this.error() !== null);

  /** Reports the state of a form after every change. */
  update(source: object, state: { dirty: boolean; invalid: boolean }): void {
    this.dirty.update((set) => (state.dirty ? withItem(set, source) : withoutItem(set, source)));
    this.invalid.update((set) =>
      state.invalid ? withItem(set, source) : withoutItem(set, source),
    );
  }

  /** Forgets a form that no longer exists. */
  release(source: object): void {
    this.update(source, { dirty: false, invalid: false });
  }

  track<T>(request: Observable<T>): Observable<T> {
    this.inFlight.update((count) => count + 1);
    this.error.set(null);
    return request.pipe(
      catchError((error: unknown) => {
        this.error.set(getApiErrorMessage(error, 'No se han podido guardar los cambios.'));
        return throwError(() => error);
      }),
      finalize(() => this.inFlight.update((count) => count - 1)),
    );
  }
}

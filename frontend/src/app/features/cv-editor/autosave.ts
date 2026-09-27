import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import {
  catchError,
  concatMap,
  debounceTime,
  EMPTY,
  filter,
  merge,
  Observable,
  Subject,
  tap,
} from 'rxjs';
import { SaveTracker } from './save-tracker';

export const AUTOSAVE_DELAY_MS = 800;

export interface AutosaveOptions {
  form: AbstractControl;
  tracker: SaveTracker;
  destroyRef: DestroyRef;
  /** Sends the current value of the form. */
  save: () => Observable<unknown>;
  onError?: (error: unknown) => void;
}

export interface Autosave {
  /** Saves right away (e.g. a retry after an error). */
  saveNow(): void;
  /** Stops saving, e.g. because the item has been deleted. */
  stop(): void;
}

/**
 * Saves the form a moment after the user stops typing, only while it is valid and one
 * request at a time, so a new item is never created twice. Pending changes are saved
 * when the component is destroyed (e.g. when leaving the editor).
 */
export function autosave({ form, tracker, destroyRef, save, onError }: AutosaveOptions): Autosave {
  const source = {};
  const saveRequests = new Subject<void>();
  let dirty = false;
  let stopped = false;

  const report = () => tracker.update(source, { dirty, invalid: dirty && form.invalid });

  const run = () => {
    const snapshot = JSON.stringify(form.getRawValue());
    return tracker.track(save()).pipe(
      tap(() => {
        // Changes made while the request was in flight still need their own save.
        if (JSON.stringify(form.getRawValue()) === snapshot) {
          dirty = false;
          report();
        }
      }),
      catchError((error: unknown) => {
        onError?.(error);
        return EMPTY;
      }),
    );
  };

  const changes = form.valueChanges.pipe(
    tap(() => {
      dirty = true;
      report();
    }),
    debounceTime(AUTOSAVE_DELAY_MS),
  );

  merge(changes, saveRequests)
    .pipe(
      filter(() => !stopped && dirty && form.valid),
      concatMap(run),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe();

  destroyRef.onDestroy(() => {
    if (!stopped && dirty && form.valid) {
      run().subscribe();
    }
    tracker.release(source);
  });

  return {
    saveNow: () => {
      dirty = true;
      saveRequests.next();
    },
    stop: () => {
      stopped = true;
      tracker.release(source);
    },
  };
}

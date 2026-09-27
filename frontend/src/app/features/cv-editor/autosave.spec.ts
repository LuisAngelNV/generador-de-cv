import { createEnvironmentInjector, DestroyRef, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { Subject, throwError } from 'rxjs';
import { AUTOSAVE_DELAY_MS, autosave } from './autosave';
import { SaveTracker } from './save-tracker';

describe('autosave', () => {
  let tracker: SaveTracker;
  let injector: EnvironmentInjector;
  let control: FormControl<string>;
  let requests: Subject<unknown>[];
  let saved: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    tracker = new SaveTracker();
    injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    control = new FormControl('', { nonNullable: true, validators: Validators.required });
    requests = [];
    saved = [];
  });

  afterEach(() => vi.useRealTimers());

  function start(options: { onError?: (error: unknown) => void } = {}) {
    return autosave({
      form: control,
      tracker,
      destroyRef: injector.get(DestroyRef),
      save: () => {
        saved.push(control.value);
        const request = new Subject<unknown>();
        requests.push(request);
        return request;
      },
      ...options,
    });
  }

  const respond = (index: number) => {
    requests[index]!.next({});
    requests[index]!.complete();
  };

  it('saves once the user stops typing', () => {
    start();
    control.setValue('A');
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS / 2);
    control.setValue('AB');
    expect(tracker.status()).toBe('unsaved');

    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
    expect(saved).toEqual(['AB']);
    expect(tracker.status()).toBe('saving');

    respond(0);
    expect(tracker.status()).toBe('saved');
  });

  it('does not save invalid values and reports them as unsavable', () => {
    start();
    control.setValue('A');
    control.setValue('');
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);

    expect(saved).toEqual([]);
    expect(tracker.status()).toBe('unsaved');
    expect(tracker.hasUnsavableChanges()).toBe(true);
  });

  it('sends one request at a time, so a new item is never created twice', () => {
    start();
    control.setValue('A');
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
    control.setValue('AB');
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
    expect(saved).toEqual(['A']);

    respond(0);
    expect(saved).toEqual(['A', 'AB']);
    // The first response is older than the current value, so there is still work pending.
    expect(tracker.status()).toBe('saving');

    respond(1);
    expect(tracker.status()).toBe('saved');
  });

  it('saves pending changes when the component is destroyed', () => {
    start();
    control.setValue('A');
    injector.destroy();

    expect(saved).toEqual(['A']);
  });

  it('stops saving once stopped (e.g. the item was deleted)', () => {
    const handle = start();
    control.setValue('A');
    handle.stop();
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
    injector.destroy();

    expect(saved).toEqual([]);
    expect(tracker.status()).toBe('saved');
  });

  it('reports errors and can retry', () => {
    const onError = vi.fn();
    let fail = true;
    const handle = autosave({
      form: control,
      tracker,
      destroyRef: injector.get(DestroyRef),
      save: () => {
        saved.push(control.value);
        if (fail) return throwError(() => new Error('offline'));
        const request = new Subject<unknown>();
        requests.push(request);
        return request;
      },
      onError,
    });

    control.setValue('A');
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
    expect(onError).toHaveBeenCalled();
    expect(tracker.status()).toBe('error');

    fail = false;
    handle.saveNow();
    respond(0);
    expect(saved).toEqual(['A', 'A']);
    expect(tracker.status()).toBe('saved');
  });
});

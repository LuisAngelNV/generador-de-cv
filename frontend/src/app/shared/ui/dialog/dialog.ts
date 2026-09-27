import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

let nextId = 0;

/**
 * Modal built on the native <dialog>, which already traps focus, closes with Escape and
 * returns focus to the element that opened it. The parent owns the `open` state.
 */
@Component({
  selector: 'app-dialog',
  template: `
    <dialog
      #dialog
      class="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
      [attr.aria-labelledby]="titleId"
      (close)="closed.emit()"
    >
      <div class="p-6">
        <h2 [id]="titleId" class="text-lg font-semibold">{{ heading() }}</h2>
        <div class="mt-4">
          <ng-content />
        </div>
      </div>
    </dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dialog {
  readonly open = input.required<boolean>();
  readonly heading = input.required<string>();
  /** Emitted when the dialog closes by itself (Escape) or after `open` becomes false. */
  readonly closed = output();

  protected readonly titleId = `app-dialog-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }
}

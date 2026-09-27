import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { tap } from 'rxjs';
import { CvsService } from '../../../core/cvs/cvs.service';
import { getApiErrorMessage } from '../../../core/http/api-error';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { Autosave, autosave } from '../autosave';
import {
  buildItemForm,
  FormValues,
  ItemFormGroup,
  SectionConfig,
  toItemPayload,
} from '../editor-fields';
import { FormField } from '../form-field/form-field';
import { SaveTracker } from '../save-tracker';

/** An item of a section as the editor sees it. `id` is null until it is first saved. */
export interface EditorItem {
  key: string;
  id: string | null;
  values: FormValues;
}

let nextId = 0;

@Component({
  selector: 'app-section-item',
  imports: [ReactiveFormsModule, FormField, Dialog],
  templateUrl: './section-item.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionItem implements OnInit {
  private readonly cvsService = inject(CvsService);
  private readonly tracker = inject(SaveTracker);
  private readonly destroyRef = inject(DestroyRef);

  readonly config = input.required<SectionConfig>();
  readonly cvId = input.required<string>();
  readonly item = input.required<EditorItem>();
  readonly expanded = input(false);
  readonly isFirst = input(false);
  readonly isLast = input(false);

  readonly created = output<string>();
  readonly removed = output();
  readonly toggled = output();
  readonly movedUp = output();
  readonly movedDown = output();

  protected readonly idPrefix = `item-${nextId++}`;
  protected form!: ItemFormGroup;
  protected readonly title = signal('');
  protected readonly saveError = signal<string | null>(null);
  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  private id: string | null = null;
  private autosaveHandle!: Autosave;

  ngOnInit(): void {
    const config = this.config();
    this.id = this.item().id;
    this.form = buildItemForm(config, this.item().values);
    this.title.set(config.itemTitle(this.form.getRawValue()));
    this.linkDisabledFields();

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.title.set(config.itemTitle(this.form.getRawValue())));

    this.autosaveHandle = autosave({
      form: this.form,
      tracker: this.tracker,
      destroyRef: this.destroyRef,
      save: () => this.save(),
      onError: (error) =>
        this.saveError.set(getApiErrorMessage(error, 'No se han podido guardar los cambios.')),
    });
  }

  protected retrySave(): void {
    this.autosaveHandle.saveNow();
  }

  protected confirmDelete(): void {
    this.autosaveHandle.stop();
    if (!this.id) {
      this.removed.emit();
      return;
    }

    this.deleting.set(true);
    this.deleteError.set(null);
    this.tracker
      .track(this.cvsService.deleteItem(this.cvId(), this.config().key, this.id))
      .subscribe({
        next: () => {
          this.confirmingDelete.set(false);
          this.removed.emit();
        },
        error: (error: unknown) => {
          this.deleteError.set(getApiErrorMessage(error, 'No se ha podido eliminar.'));
          this.deleting.set(false);
        },
      });
  }

  /** Creates the item on its first save and updates it afterwards. */
  private save() {
    const config = this.config();
    const payload = toItemPayload(config, this.form.getRawValue());
    const request = this.id
      ? this.cvsService.updateItem(this.cvId(), config.key, this.id, payload)
      : this.cvsService.createItem(this.cvId(), config.key, payload);

    return request.pipe(
      tap((saved) => {
        this.saveError.set(null);
        if (!this.id) {
          this.id = saved.id;
          this.created.emit(saved.id);
        }
      }),
    );
  }

  /** Fields like "end date" are cleared and disabled while "currently here" is checked. */
  private linkDisabledFields(): void {
    for (const field of this.config().fields) {
      if (!field.disabledBy) continue;
      const trigger = this.form.controls[field.disabledBy];
      const target = this.form.controls[field.key];
      if (!trigger || !target) continue;

      const apply = (checked: boolean, emitEvent: boolean) => {
        if (checked) {
          target.setValue('', { emitEvent: false });
          target.disable({ emitEvent });
        } else {
          target.enable({ emitEvent });
        }
      };
      apply(trigger.value === true, false);
      trigger.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((checked) => apply(checked === true, true));
    }
  }
}

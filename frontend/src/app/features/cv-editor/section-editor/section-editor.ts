import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, concatMap, EMPTY, Subject } from 'rxjs';
import { CvsService } from '../../../core/cvs/cvs.service';
import { SectionConfig, toFormValues } from '../editor-fields';
import { SaveTracker } from '../save-tracker';
import { EditorItem, SectionItem } from './section-item';

/** A list section of the CV (experience, education…): add, edit, reorder and delete items. */
@Component({
  selector: 'app-section-editor',
  imports: [SectionItem],
  template: `
    @let section = config();
    <section
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      [attr.aria-labelledby]="headingId()"
    >
      <h2 [id]="headingId()" class="text-lg font-semibold">{{ section.title }}</h2>

      @if (items().length === 0) {
        <p class="mt-2 text-sm text-slate-600">{{ section.emptyText }}</p>
      } @else {
        <ul class="mt-4 space-y-3">
          @for (item of items(); track item.key; let first = $first; let last = $last) {
            <li>
              <app-section-item
                [config]="section"
                [cvId]="cvId()"
                [item]="item"
                [expanded]="expanded().has(item.key)"
                [isFirst]="first"
                [isLast]="last"
                (toggled)="toggle(item.key)"
                (created)="onCreated(item.key, $event)"
                (removed)="onRemoved(item.key)"
                (movedUp)="move(item.key, -1)"
                (movedDown)="move(item.key, 1)"
              />
            </li>
          }
        </ul>
      }

      <button type="button" class="btn-secondary mt-4" (click)="add()">
        <span aria-hidden="true">+</span> {{ section.addLabel }}
      </button>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionEditor implements OnInit {
  private readonly cvsService = inject(CvsService);
  private readonly tracker = inject(SaveTracker);

  readonly config = input.required<SectionConfig>();
  readonly cvId = input.required<string>();
  readonly initialItems = input.required<readonly object[]>();

  protected readonly items = signal<EditorItem[]>([]);
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  protected readonly headingId = computed(() => `section-${this.config().key}`);

  /** Reorders are sent one after another, so the last one the user made always wins. */
  private readonly reorders = new Subject<string[]>();

  constructor() {
    this.reorders
      .pipe(
        concatMap((ids) =>
          this.tracker
            .track(this.cvsService.reorderItems(this.cvId(), this.config().key, ids))
            .pipe(catchError(() => EMPTY)),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.items.set(
      this.initialItems().map((item) => {
        const values = item as Record<string, unknown>;
        const id = values['id'] as string;
        return { key: id, id, values: toFormValues(this.config(), values) };
      }),
    );
  }

  protected add(): void {
    const key = crypto.randomUUID();
    this.items.update((items) => [
      ...items,
      { key, id: null, values: toFormValues(this.config(), null) },
    ]);
    this.expanded.update((keys) => new Set(keys).add(key));
  }

  protected toggle(key: string): void {
    this.expanded.update((keys) => {
      const next = new Set(keys);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  /** New items are appended on the server; keep the order the user sees. */
  protected onCreated(key: string, id: string): void {
    this.items.update((items) => items.map((item) => (item.key === key ? { ...item, id } : item)));
    const saved = this.items().filter((item) => item.id);
    if (saved.at(-1)?.key !== key) {
      this.syncOrder();
    }
  }

  protected onRemoved(key: string): void {
    this.items.update((items) => items.filter((item) => item.key !== key));
  }

  protected move(key: string, offset: -1 | 1): void {
    const items = [...this.items()];
    const from = items.findIndex((item) => item.key === key);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= items.length) return;

    [items[from], items[to]] = [items[to]!, items[from]!];
    this.items.set(items);
    this.syncOrder();
  }

  /** Sends the order of the items already saved; drafts are ordered when they are created. */
  private syncOrder(): void {
    const ids = this.items()
      .map((item) => item.id)
      .filter((id): id is string => id !== null);
    if (ids.length >= 2) {
      this.reorders.next(ids);
    }
  }
}

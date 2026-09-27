import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CvSummary } from '../../../core/cvs/cv.models';

@Component({
  selector: 'app-cv-card',
  imports: [DatePipe],
  template: `
    @let item = cv();
    <article
      class="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      [attr.aria-busy]="busy()"
    >
      <h2 class="text-lg font-semibold break-words">{{ item.title }}</h2>
      <p class="mt-1 text-sm break-words text-slate-600">
        {{ item.fullName || 'Sin nombre' }}
        @if (item.headline) {
          · {{ item.headline }}
        }
      </p>
      <p class="mt-3 text-xs text-slate-500">
        Actualizado el
        <time [attr.datetime]="item.updatedAt">{{ item.updatedAt | date: 'd MMM y, HH:mm' }}</time>
      </p>

      <div class="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          class="btn-secondary text-sm"
          [disabled]="busy()"
          (click)="rename.emit()"
        >
          Renombrar <span class="sr-only">{{ item.title }}</span>
        </button>
        <button
          type="button"
          class="btn-secondary text-sm"
          [disabled]="busy()"
          (click)="duplicate.emit()"
        >
          Duplicar <span class="sr-only">{{ item.title }}</span>
        </button>
        <button
          type="button"
          class="btn-secondary text-sm text-red-700 hover:bg-red-50"
          [disabled]="busy()"
          (click)="remove.emit()"
        >
          Eliminar <span class="sr-only">{{ item.title }}</span>
        </button>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvCard {
  readonly cv = input.required<CvSummary>();
  readonly busy = input(false);

  readonly rename = output();
  readonly duplicate = output();
  readonly remove = output();
}

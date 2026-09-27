import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CvSummary } from '../../../core/cvs/cv.models';

@Component({
  selector: 'app-cv-card',
  imports: [DatePipe, RouterLink],
  template: `
    @let item = cv();
    <article
      class="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      [attr.aria-busy]="busy()"
    >
      <h2 class="text-lg font-semibold break-words">
        <a [routerLink]="['/cvs', item.id]" class="hover:underline">{{ item.title }}</a>
      </h2>
      <p class="mt-1 text-sm break-words text-slate-600">
        {{ item.fullName || 'Sin nombre' }}
        @if (item.headline) {
          · {{ item.headline }}
        }
      </p>
      <p class="mt-3 mb-5 text-xs text-slate-500">
        Actualizado el
        <time [attr.datetime]="item.updatedAt">{{ item.updatedAt | date: 'd MMM y, HH:mm' }}</time>
      </p>

      <div class="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <a [routerLink]="['/cvs', item.id]" class="btn-primary text-sm">
          Editar <span class="sr-only">{{ item.title }}</span>
        </a>
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

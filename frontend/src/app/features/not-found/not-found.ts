import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <main class="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 class="text-2xl font-bold text-slate-900 sm:text-4xl">Página no encontrada</h1>
      <p class="text-slate-600">La página que buscas no existe o se ha movido.</p>
      <a
        routerLink="/"
        class="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        Volver al inicio
      </a>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}

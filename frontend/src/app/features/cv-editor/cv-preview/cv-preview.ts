import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { catchError, combineLatest, debounceTime, of, switchMap, tap } from 'rxjs';
import { CvsService } from '../../../core/cvs/cvs.service';

/** Width of an A4 page in CSS pixels (210 mm at 96 dpi), as drawn by the template on screen. */
export const A4_WIDTH_PX = 794;
const RELOAD_DEBOUNCE_MS = 300;

/**
 * Shows the saved CV exactly as the PDF template renders it, scaled to the available width.
 * The document comes from our API with every user value escaped and a CSP that blocks
 * scripts; the iframe sandbox also forbids scripts. Same-origin is kept only to measure
 * the height of the document.
 */
@Component({
  selector: 'app-cv-preview',
  template: `
    <div #container class="relative w-full" [style.height.px]="scaledHeight()">
      @if (document(); as doc) {
        <iframe
          #frame
          title="Vista previa del CV"
          class="absolute top-0 left-0 origin-top-left bg-white shadow-md ring-1 ring-slate-200"
          sandbox="allow-same-origin"
          [srcdoc]="doc"
          [style.width.px]="pageWidth"
          [style.height.px]="contentHeight()"
          [style.transform]="'scale(' + scale() + ')'"
          (load)="measure()"
        ></iframe>
      }

      @if (state() === 'loading' && !document()) {
        <div
          class="aspect-[210/297] w-full animate-pulse rounded bg-slate-200"
          role="status"
          aria-label="Cargando la vista previa"
        ></div>
      }
    </div>

    @if (state() === 'error') {
      <div class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
        No se ha podido cargar la vista previa.
        <button type="button" class="font-medium underline" (click)="reload()">Reintentar</button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvPreview {
  private readonly cvsService = inject(CvsService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly cvId = input.required<string>();
  /** Any change reloads the preview (the editor passes its save revision). */
  readonly revision = input(0);

  protected readonly pageWidth = A4_WIDTH_PX;
  protected readonly document = signal<SafeHtml | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly contentHeight = signal(Math.round((A4_WIDTH_PX * 297) / 210));
  private readonly containerWidth = signal(A4_WIDTH_PX);
  private readonly retries = signal(0);

  protected readonly scale = computed(() => Math.min(1, this.containerWidth() / A4_WIDTH_PX));
  protected readonly scaledHeight = computed(() => this.contentHeight() * this.scale());

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');

  constructor() {
    combineLatest([
      toObservable(this.cvId),
      toObservable(this.revision),
      toObservable(this.retries),
    ])
      .pipe(
        debounceTime(RELOAD_DEBOUNCE_MS),
        tap(() => this.state.set('loading')),
        // Only the latest preview matters: older responses are discarded.
        switchMap(([cvId]) => this.cvsService.preview(cvId).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((html) => {
        if (html === null) {
          this.state.set('error');
          return;
        }
        // Safe: server-rendered, escaped HTML shown in a sandbox without scripts (see above).
        this.document.set(this.sanitizer.bypassSecurityTrustHtml(html));
        this.state.set('ready');
      });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // While hidden (the mobile "Editar" tab) the size is 0: keep the last one and measure
      // again once visible, since the document cannot be measured while hidden either.
      const observer = new ResizeObserver(([entry]) => {
        const width = entry?.contentRect.width ?? 0;
        if (width > 0) {
          this.containerWidth.set(width);
          this.measure();
        }
      });
      observer.observe(this.container().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected reload(): void {
    this.retries.update((count) => count + 1);
  }

  /** The iframe grows with the document, so every page is visible without inner scroll. */
  protected measure(): void {
    // The body (min-height: one A4 page) shrinks with the content; the root element does not.
    const height = this.frame()?.nativeElement.contentDocument?.body.offsetHeight;
    if (height) {
      this.contentHeight.set(height);
    }
  }
}

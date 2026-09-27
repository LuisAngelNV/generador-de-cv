import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CvPreview } from './cv-preview';

// jsdom has no ResizeObserver.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  } as unknown as typeof ResizeObserver;
});

describe('CvPreview', () => {
  let fixture: ComponentFixture<CvPreview>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CvPreview);
    fixture.componentRef.setInput('cvId', 'cv-1');
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const iframe = () => element.querySelector('iframe');

  async function flushPreview(html: string) {
    vi.advanceTimersByTime(300);
    const req = http.expectOne('/api/cvs/cv-1/preview');
    expect(req.request.responseType).toBe('text');
    req.flush(html);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('shows the rendered CV in a sandboxed iframe without scripts', async () => {
    await flushPreview('<html><body><h1>Ana</h1></body></html>');

    expect(iframe()?.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(iframe()?.getAttribute('srcdoc')).toContain('<h1>Ana</h1>');
  });

  it('reloads when the save revision changes', async () => {
    await flushPreview('<p>v1</p>');

    fixture.componentRef.setInput('revision', 1);
    fixture.detectChanges();
    await flushPreview('<p>v2</p>');

    expect(iframe()?.getAttribute('srcdoc')).toContain('v2');
  });

  it('coalesces several saves in a row into a single reload', async () => {
    await flushPreview('<p>v1</p>');

    for (const revision of [1, 2, 3]) {
      fixture.componentRef.setInput('revision', revision);
      fixture.detectChanges();
      vi.advanceTimersByTime(100);
    }
    await flushPreview('<p>v4</p>');
  });

  it('offers a retry when the preview cannot be loaded', async () => {
    vi.advanceTimersByTime(300);
    http.expectOne('/api/cvs/cv-1/preview').flush('', { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.textContent).toContain('No se ha podido cargar la vista previa');

    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    fixture.detectChanges();
    await flushPreview('<p>ok</p>');

    expect(iframe()?.getAttribute('srcdoc')).toContain('ok');
  });
});

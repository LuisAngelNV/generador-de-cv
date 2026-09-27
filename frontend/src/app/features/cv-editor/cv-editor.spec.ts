import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CvDetail } from '../../core/cvs/cv.models';
import { CvEditor } from './cv-editor';

const cv: CvDetail = {
  id: 'cv-1',
  title: 'Frontend',
  templateId: 'classic',
  language: 'es',
  fullName: 'Ana García',
  headline: 'Desarrolladora',
  summary: null,
  email: 'ana@example.com',
  phone: null,
  location: null,
  links: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  experiences: [
    {
      id: 'exp-1',
      cvId: 'cv-1',
      order: 0,
      position: 'Dev',
      company: 'ACME',
      location: null,
      startDate: '2021-03-01T00:00:00.000Z',
      endDate: null,
      isCurrent: true,
      description: null,
      createdAt: '',
      updatedAt: '',
    },
  ],
  educations: [],
  skills: [],
  languages: [],
  projects: [],
  certifications: [],
};

// jsdom has no ResizeObserver (used by the preview) nor object URLs (used by the download).
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  } as unknown as typeof ResizeObserver;
  URL.createObjectURL ??= () => 'blob:test';
  URL.revokeObjectURL ??= () => undefined;
});

describe('CvEditor', () => {
  let fixture: ComponentFixture<CvEditor>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CvEditor);
    fixture.componentRef.setInput('id', 'cv-1');
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    // The preview loads on its own after a short delay; it has its own tests.
    http.match((req) => req.url.endsWith('/preview')).forEach((req) => req.flush(''));
    http.verify();
  });

  it('loads the CV and shows the profile and every section', async () => {
    http.expectOne('/api/cvs/cv-1').flush({ cv });
    await fixture.whenStable();

    const headings = [...element.querySelectorAll('section > h2')].map((h) =>
      h.textContent?.trim(),
    );
    expect(headings).toEqual([
      'Datos personales',
      'Experiencia laboral',
      'Educación',
      'Habilidades',
      'Idiomas',
      'Proyectos',
      'Certificaciones',
    ]);
    expect(element.querySelector<HTMLInputElement>('[id$="-fullName"]')?.value).toBe('Ana García');
    expect(element.textContent).toContain('Dev · ACME');
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Todos los cambios guardados',
    );
  });

  it('shows a not found message for unknown CVs', async () => {
    http.expectOne('/api/cvs/cv-1').flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(element.textContent).toContain('No se ha encontrado este CV');
  });

  it('downloads the PDF with the name sent by the server', async () => {
    http.expectOne('/api/cvs/cv-1').flush({ cv });
    await fixture.whenStable();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const button = [...element.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Descargar PDF'),
    ) as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    expect(button.textContent).toContain('Generando');

    http.expectOne('/api/cvs/cv-1/pdf').flush(new Blob(['%PDF-'], { type: 'application/pdf' }), {
      headers: { 'Content-Disposition': 'attachment; filename="ana-garcia.pdf"' },
    });
    await fixture.whenStable();

    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('ana-garcia.pdf');
    expect(button.textContent).toContain('Descargar PDF');
    click.mockRestore();
  });

  it('shows an error when the PDF cannot be generated', async () => {
    http.expectOne('/api/cvs/cv-1').flush({ cv });
    await fixture.whenStable();

    [...element.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Descargar PDF'))
      ?.click();
    await fixture.whenStable();
    http
      .expectOne('/api/cvs/cv-1/pdf')
      .flush(new Blob(), { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();

    expect(element.querySelector('main [role="alert"]')?.textContent).toContain(
      'No se ha podido generar el PDF',
    );
  });

  it('lets the user leave while there is nothing that cannot be saved', async () => {
    http.expectOne('/api/cvs/cv-1').flush({ cv });
    await fixture.whenStable();

    expect(fixture.componentInstance.canLeave()).toBe(true);
  });
});

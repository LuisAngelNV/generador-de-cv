import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CvSummary } from '../../core/cvs/cv.models';
import { Dashboard } from './dashboard';

const cv = (id: string, title: string): CvSummary => ({
  id,
  title,
  templateId: 'classic',
  language: 'es',
  fullName: 'Ana García',
  headline: null,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
});

// jsdom does not implement <dialog>.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Dashboard);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function respondWithCvs(cvs: CvSummary[]) {
    http.expectOne('/api/cvs').flush({ cvs });
    await fixture.whenStable();
  }

  const button = (label: string) =>
    [...element.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(label));

  // jsdom does not implement requestSubmit(), so clicking a submit button does nothing.
  const submitTitleForm = () =>
    element.querySelector('dialog form')?.dispatchEvent(new Event('submit'));

  const titles = () =>
    [...element.querySelectorAll('article h2')].map((h) => h.textContent?.trim());

  it('shows the CVs of the user', async () => {
    await respondWithCvs([cv('1', 'Frontend'), cv('2', 'Backend')]);

    expect(titles()).toEqual(['Frontend', 'Backend']);
  });

  it('shows an empty state with a button to create the first CV', async () => {
    await respondWithCvs([]);

    expect(element.textContent).toContain('Todavía no tienes ningún CV');
    expect(button('Crear mi primer CV')).toBeDefined();
  });

  it('offers a retry when the list cannot be loaded', async () => {
    http.expectOne('/api/cvs').flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    button('Reintentar')?.click();
    await respondWithCvs([cv('1', 'Frontend')]);

    expect(titles()).toEqual(['Frontend']);
  });

  it('creates a CV and shows it first', async () => {
    await respondWithCvs([cv('1', 'Frontend')]);

    button('Nuevo CV')?.click();
    await fixture.whenStable();
    const input = element.querySelector<HTMLInputElement>('#cv-title');
    input!.value = 'Backend';
    input!.dispatchEvent(new Event('input'));
    submitTitleForm();

    const req = http.expectOne('/api/cvs');
    expect(req.request.body).toEqual({ title: 'Backend' });
    req.flush({ cv: cv('2', 'Backend') });
    await fixture.whenStable();

    expect(titles()).toEqual(['Backend', 'Frontend']);
  });

  it('does not create a CV without a title', async () => {
    await respondWithCvs([cv('1', 'Frontend')]);

    button('Nuevo CV')?.click();
    await fixture.whenStable();
    submitTitleForm();
    await fixture.whenStable();

    http.expectNone({ method: 'POST', url: '/api/cvs' });
    expect(element.textContent).toContain('Escribe un título');
  });

  it('deletes a CV after confirmation', async () => {
    await respondWithCvs([cv('1', 'Frontend'), cv('2', 'Backend')]);

    button('Eliminar')?.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('¿Seguro que quieres eliminar');

    const confirm = [...element.querySelectorAll('dialog button')].find(
      (b) => b.textContent?.trim() === 'Eliminar',
    ) as HTMLButtonElement;
    confirm.click();
    const req = http.expectOne('/api/cvs/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(titles()).toEqual(['Backend']);
  });

  it('shows an error when duplicating fails', async () => {
    await respondWithCvs([cv('1', 'Frontend')]);

    button('Duplicar')?.click();
    http.expectOne('/api/cvs/1/duplicate').flush(
      { error: { code: 'X', message: 'Algo ha fallado', details: [] } },
      {
        status: 500,
        statusText: 'Error',
      },
    );
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Algo ha fallado');
  });
});

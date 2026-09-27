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

  afterEach(() => http.verify());

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

  it('lets the user leave while there is nothing that cannot be saved', async () => {
    http.expectOne('/api/cvs/cv-1').flush({ cv });
    await fixture.whenStable();

    expect(fixture.componentInstance.canLeave()).toBe(true);
  });
});

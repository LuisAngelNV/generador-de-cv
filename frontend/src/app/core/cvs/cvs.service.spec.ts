import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CvsService } from './cvs.service';

describe('CvsService', () => {
  let service: CvsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CvsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('unwraps the list of CVs', () => {
    let result: unknown;
    service.list().subscribe((cvs) => (result = cvs));

    http.expectOne('/api/cvs').flush({ cvs: [{ id: '1' }] });

    expect(result).toEqual([{ id: '1' }]);
  });

  it('sends partial updates with PATCH', () => {
    service.update('cv-1', { title: 'Nuevo' }).subscribe();

    const req = http.expectOne('/api/cvs/cv-1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'Nuevo' });
    req.flush({ cv: {} });
  });

  it('duplicates with POST to /duplicate', () => {
    service.duplicate('cv-1').subscribe();

    expect(http.expectOne('/api/cvs/cv-1/duplicate').request.method).toBe('POST');
  });

  it('builds section item URLs', () => {
    service.createItem('cv-1', 'skills', { name: 'TypeScript', level: null }).subscribe();
    service.deleteItem('cv-1', 'skills', 'skill-1').subscribe();
    service.reorderItems('cv-1', 'skills', ['b', 'a']).subscribe();

    expect(http.expectOne('/api/cvs/cv-1/skills').request.method).toBe('POST');
    expect(http.expectOne('/api/cvs/cv-1/skills/skill-1').request.method).toBe('DELETE');
    const reorder = http.expectOne('/api/cvs/cv-1/skills/order');
    expect(reorder.request.method).toBe('PUT');
    expect(reorder.request.body).toEqual({ ids: ['b', 'a'] });
  });
});

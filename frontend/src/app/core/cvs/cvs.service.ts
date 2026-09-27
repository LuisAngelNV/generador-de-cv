import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  CreateCvRequest,
  CvDetail,
  CvProfile,
  CvSectionKey,
  CvSections,
  CvSummary,
  SectionItemInput,
} from './cv.models';

const API = '/api/cvs';

@Injectable({ providedIn: 'root' })
export class CvsService {
  private readonly http = inject(HttpClient);

  list(): Observable<CvSummary[]> {
    return this.http.get<{ cvs: CvSummary[] }>(API).pipe(map(({ cvs }) => cvs));
  }

  get(cvId: string): Observable<CvDetail> {
    return this.http.get<{ cv: CvDetail }>(`${API}/${cvId}`).pipe(map(({ cv }) => cv));
  }

  create(data: CreateCvRequest): Observable<CvDetail> {
    return this.http.post<{ cv: CvDetail }>(API, data).pipe(map(({ cv }) => cv));
  }

  update(cvId: string, data: Partial<CvProfile>): Observable<CvDetail> {
    return this.http.patch<{ cv: CvDetail }>(`${API}/${cvId}`, data).pipe(map(({ cv }) => cv));
  }

  delete(cvId: string): Observable<void> {
    return this.http.delete<void>(`${API}/${cvId}`);
  }

  duplicate(cvId: string): Observable<CvDetail> {
    return this.http
      .post<{ cv: CvDetail }>(`${API}/${cvId}/duplicate`, {})
      .pipe(map(({ cv }) => cv));
  }

  createItem<K extends CvSectionKey>(
    cvId: string,
    section: K,
    data: SectionItemInput<K>,
  ): Observable<CvSections[K]> {
    return this.http
      .post<{ item: CvSections[K] }>(`${API}/${cvId}/${section}`, data)
      .pipe(map(({ item }) => item));
  }

  updateItem<K extends CvSectionKey>(
    cvId: string,
    section: K,
    itemId: string,
    data: Partial<SectionItemInput<K>>,
  ): Observable<CvSections[K]> {
    return this.http
      .patch<{ item: CvSections[K] }>(`${API}/${cvId}/${section}/${itemId}`, data)
      .pipe(map(({ item }) => item));
  }

  deleteItem(cvId: string, section: CvSectionKey, itemId: string): Observable<void> {
    return this.http.delete<void>(`${API}/${cvId}/${section}/${itemId}`);
  }

  /** `ids` must contain every item of the section, in the new order. */
  reorderItems<K extends CvSectionKey>(
    cvId: string,
    section: K,
    ids: string[],
  ): Observable<CvSections[K][]> {
    return this.http
      .put<{ items: CvSections[K][] }>(`${API}/${cvId}/${section}/order`, { ids })
      .pipe(map(({ items }) => items));
  }
}

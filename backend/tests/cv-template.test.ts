import { escapeHtml, html, safeUrl } from '../src/lib/html';
import type { CvDetail } from '../src/modules/cvs/cvs.service';
import { toFilename } from '../src/modules/pdf/pdf.service';
import { renderCvHtml } from '../src/templates';

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const timestamps = { createdAt: new Date(), updatedAt: new Date() };

function buildCv(overrides: Partial<CvDetail> = {}): CvDetail {
  return {
    id: 'cv-1',
    title: 'Mi CV',
    templateId: 'classic',
    language: 'es',
    fullName: 'Ana García',
    headline: 'Desarrolladora frontend',
    summary: null,
    email: 'ana@example.com',
    phone: null,
    location: 'Madrid',
    links: [],
    ...timestamps,
    experiences: [
      {
        id: 'e1',
        cvId: 'cv-1',
        order: 0,
        position: 'Dev',
        company: 'ACME',
        location: null,
        startDate: date('2021-03-01'),
        endDate: null,
        isCurrent: true,
        description: 'Primera línea\nSegunda línea',
        ...timestamps,
      },
    ],
    educations: [],
    skills: [],
    languages: [],
    projects: [],
    certifications: [],
    ...overrides,
  };
}

describe('html helpers', () => {
  it('escapes interpolated values', () => {
    const name = '<img src=x onerror=alert(1)>';
    expect(html`<p>${name}</p>`.value).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
    expect(escapeHtml(`"'&`)).toBe('&quot;&#39;&amp;');
  });

  it('only keeps http(s) URLs', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
});

describe('classic template', () => {
  it('renders the profile and the sections with content', () => {
    const output = renderCvHtml(buildCv());

    expect(output).toContain('<h1 class="name">Ana García</h1>');
    expect(output).toContain('Desarrolladora frontend');
    expect(output).toContain('Experiencia');
    expect(output).toContain('mar 2021 – Actualidad');
    // Empty sections are left out.
    expect(output).not.toContain('Formación');
  });

  it('escapes everything the user wrote', () => {
    const output = renderCvHtml(
      buildCv({ fullName: '<script>alert(1)</script>', headline: '"><img src=x>' }),
    );

    expect(output).not.toContain('<script>alert(1)');
    expect(output).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(output).not.toContain('<img src=x>');
  });

  it('blocks scripts and external requests with a CSP', () => {
    expect(renderCvHtml(buildCv())).toContain(
      `content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:"`,
    );
  });

  it('does not turn unsafe links into anchors', () => {
    const output = renderCvHtml(
      buildCv({
        links: [
          { label: 'Web', url: 'https://ana.dev' },
          { label: 'Malo', url: 'javascript:alert(1)' },
        ],
      }),
    );

    expect(output).toContain('<a href="https://ana.dev">ana.dev</a>');
    expect(output).not.toContain('href="javascript');
  });

  it('uses the language of the CV for titles and dates', () => {
    const output = renderCvHtml(buildCv({ language: 'en' }));

    expect(output).toContain('<html lang="en">');
    expect(output).toContain('Experience');
    expect(output).toContain('Mar 2021 – Present');
  });

  it('shows skill and language levels', () => {
    const output = renderCvHtml(
      buildCv({
        skills: [
          { id: 's', cvId: 'cv-1', order: 0, name: 'TypeScript', level: 'EXPERT', ...timestamps },
        ],
        languages: [
          { id: 'l', cvId: 'cv-1', order: 0, name: 'Inglés', proficiency: 'C1', ...timestamps },
        ],
      }),
    );

    expect(output).toContain('(Experto)');
    expect(output).toContain('(C1)');
  });
});

describe('PDF filename', () => {
  it('is an ASCII slug', () => {
    expect(toFilename('Ana García – Frontend')).toBe('ana-garcia-frontend.pdf');
    expect(toFilename('***')).toBe('cv.pdf');
  });
});

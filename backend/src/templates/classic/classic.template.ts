import { html, SafeHtml, safeUrl } from '../../lib/html';
import type { CvDetail } from '../../modules/cvs/cvs.service';
import { labelsFor, type TemplateLabels } from '../labels';
import { CLASSIC_STYLES } from './styles';

interface TemplateContext {
  labels: TemplateLabels;
  locale: string;
}

function formatMonth(date: Date | null, locale: string): string {
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(date)
    .replace('.', '');
}

function formatRange(
  start: Date | null,
  end: Date | null,
  isCurrent: boolean,
  { labels, locale }: TemplateContext,
): string {
  const from = formatMonth(start, locale);
  const to = isCurrent ? labels.present : formatMonth(end, locale);
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

const joinParts = (...parts: (string | null | undefined)[]) =>
  parts.filter((part) => part && part.trim()).join(' · ');

function link(url: string | null | undefined, text: string): SafeHtml | string {
  const href = safeUrl(url);
  return href ? html`<a href="${href}">${text}</a>` : text;
}

/** Shown without protocol, which reads better on paper. */
const displayUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

function section(title: string, content: SafeHtml): SafeHtml {
  return html`<section class="section">
    <h2 class="section-title">${title}</h2>
    ${content}
  </section>`;
}

function entry(options: {
  title: string;
  dates?: string;
  subtitle?: string | SafeHtml;
  meta?: string;
  description?: string | null;
}): SafeHtml {
  return html`<article class="entry">
    <div class="entry-header">
      <h3 class="entry-title">${options.title}</h3>
      ${options.dates ? html`<span class="entry-dates">${options.dates}</span>` : null}
    </div>
    ${
      options.subtitle || options.meta
        ? html`<p class="entry-subtitle">
            ${options.subtitle}${options.subtitle && options.meta ? ' · ' : ''}${
              options.meta ? html`<span class="entry-meta">${options.meta}</span>` : null
            }
          </p>`
        : null
    }
    ${options.description ? html`<p class="entry-description">${options.description}</p>` : null}
  </article>`;
}

function header(cv: CvDetail): SafeHtml {
  const links = Array.isArray(cv.links) ? (cv.links as { label: string; url: string }[]) : [];
  const contact = [
    cv.email ? html`<li>${cv.email}</li>` : null,
    cv.phone ? html`<li>${cv.phone}</li>` : null,
    cv.location ? html`<li>${cv.location}</li>` : null,
    ...links.map((item) => html`<li>${item.label}: ${link(item.url, displayUrl(item.url))}</li>`),
  ].filter((item): item is SafeHtml => item !== null);

  return html`<header class="header">
    ${cv.fullName ? html`<h1 class="name">${cv.fullName}</h1>` : null}
    ${cv.headline ? html`<p class="headline">${cv.headline}</p>` : null}
    ${
      contact.length
        ? html`<ul class="contact">
            ${contact}
          </ul>`
        : null
    }
  </header>`;
}

function sections(cv: CvDetail, ctx: TemplateContext): (SafeHtml | null)[] {
  const { labels, locale } = ctx;
  return [
    cv.summary ? section(labels.summary, html`<p class="summary">${cv.summary}</p>`) : null,

    cv.experiences.length
      ? section(
          labels.experiences,
          html`${cv.experiences.map((item) =>
            entry({
              title: item.position,
              dates: formatRange(item.startDate, item.endDate, item.isCurrent, ctx),
              subtitle: item.company,
              meta: item.location ?? undefined,
              description: item.description,
            }),
          )}`,
        )
      : null,

    cv.educations.length
      ? section(
          labels.educations,
          html`${cv.educations.map((item) =>
            entry({
              title: joinParts(item.degree, item.fieldOfStudy),
              dates: formatRange(item.startDate, item.endDate, item.isCurrent, ctx),
              subtitle: item.institution,
              meta: item.location ?? undefined,
              description: item.description,
            }),
          )}`,
        )
      : null,

    cv.projects.length
      ? section(
          labels.projects,
          html`${cv.projects.map((item) => {
            const url = safeUrl(item.url);
            return entry({
              title: item.name,
              dates: formatRange(item.startDate, item.endDate, false, ctx),
              subtitle: url
                ? html`${item.role ? `${item.role} · ` : ''}${link(url, displayUrl(url))}`
                : (item.role ?? undefined),
              description: item.description,
            });
          })}`,
        )
      : null,

    cv.certifications.length
      ? section(
          labels.certifications,
          html`${cv.certifications.map((item) => {
            const expires = item.expirationDate
              ? `${labels.expires} ${formatMonth(item.expirationDate, locale)}`
              : '';
            const credentialUrl = safeUrl(item.credentialUrl);
            return entry({
              title: item.name,
              dates: formatMonth(item.issueDate, locale),
              subtitle: credentialUrl
                ? html`${item.issuer} · ${link(credentialUrl, labels.credential)}`
                : item.issuer,
              meta: joinParts(expires, item.credentialId) || undefined,
            });
          })}`,
        )
      : null,

    cv.skills.length
      ? section(
          labels.skills,
          html`<ul class="tags">
            ${cv.skills.map(
              (item) =>
                html`<li>
                  ${item.name}${
                    item.level
                      ? html` <span class="tag-level">(${labels.skillLevels[item.level]})</span>`
                      : null
                  }
                </li>`,
            )}
          </ul>`,
        )
      : null,

    cv.languages.length
      ? section(
          labels.languages,
          html`<ul class="tags">
            ${cv.languages.map(
              (item) =>
                html`<li>
                  ${item.name}
                  <span class="tag-level">(${labels.proficiency[item.proficiency]})</span>
                </li>`,
            )}
          </ul>`,
        )
      : null,
  ];
}

/**
 * The CV as a standalone HTML document. The same document is shown in the preview iframe and
 * printed to PDF. Every value from the user is escaped by the `html` tag, and the CSP blocks
 * scripts and any external request.
 */
export function renderClassicTemplate(cv: CvDetail): string {
  const labels = labelsFor(cv.language);
  const locale = cv.language === 'en' ? 'en-GB' : 'es-ES';
  const ctx = { labels, locale };

  return html`<!doctype html>
    <html lang="${cv.language}">
      <head>
        <meta charset="utf-8" />
        <meta
          http-equiv="Content-Security-Policy"
          content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:"
        />
        <title>${cv.fullName || cv.title}</title>
        <style>
          ${new SafeHtml(CLASSIC_STYLES)}
        </style>
      </head>
      <body>
        ${header(cv)} ${sections(cv, ctx)}
      </body>
    </html>`.value;
}

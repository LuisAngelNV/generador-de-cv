/**
 * Print stylesheet of the "classic" template. Sizes are in pt/mm so the browser preview and the
 * PDF match. Only fonts available everywhere are used, since the page cannot load external files.
 */
export const CLASSIC_STYLES = `
@page { size: A4; margin: 16mm 16mm 18mm; }

*, *::before, *::after { box-sizing: border-box; }

html { background: #fff; }

body {
  margin: 0;
  color: #1e293b;
  font-family: Arial, 'Liberation Sans', Helvetica, sans-serif;
  font-size: 10pt;
  line-height: 1.45;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* On screen the page is drawn as a sheet of A4 width; in the PDF the @page margins apply. */
@media screen {
  body { width: 210mm; min-height: 297mm; padding: 16mm; }
}

a { color: inherit; text-decoration: none; }

.header { border-bottom: 2px solid #0f172a; padding-bottom: 10pt; margin-bottom: 14pt; }
.name { margin: 0; font-size: 22pt; line-height: 1.15; color: #0f172a; letter-spacing: -0.01em; }
.headline { margin: 3pt 0 0; font-size: 12pt; color: #334155; }
.contact { margin: 8pt 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 2pt 12pt; font-size: 9pt; color: #475569; }
.contact li { overflow-wrap: anywhere; }

.section { margin-top: 14pt; }
.section-title {
  margin: 0 0 6pt;
  padding-bottom: 3pt;
  border-bottom: 1px solid #cbd5e1;
  font-size: 10pt;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f172a;
  break-after: avoid;
}

.entry { margin-top: 8pt; break-inside: avoid; }
.entry:first-of-type { margin-top: 0; }
.entry-header { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
.entry-title { margin: 0; font-size: 10.5pt; font-weight: 700; color: #0f172a; }
.entry-dates { flex-shrink: 0; font-size: 9pt; color: #475569; white-space: nowrap; }
.entry-subtitle { margin: 1pt 0 0; color: #334155; }
.entry-meta { color: #64748b; }
.entry-description { margin: 3pt 0 0; white-space: pre-line; }

.summary { margin: 0; white-space: pre-line; }

.tags { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 4pt 14pt; }
.tags li { break-inside: avoid; }
.tag-level { color: #64748b; }
`;

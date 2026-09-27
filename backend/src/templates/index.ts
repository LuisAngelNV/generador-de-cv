import type { CvDetail } from '../modules/cvs/cvs.service';
import { renderClassicTemplate } from './classic/classic.template';

const TEMPLATES: Record<string, (cv: CvDetail) => string> = {
  classic: renderClassicTemplate,
};

/** The CV as a standalone HTML document, used by both the preview and the PDF. */
export function renderCvHtml(cv: CvDetail): string {
  const render = TEMPLATES[cv.templateId] ?? renderClassicTemplate;
  return render(cv);
}

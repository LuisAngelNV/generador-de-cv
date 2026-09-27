import { AppError } from '../../lib/app-error';
import { renderPdf } from '../../lib/pdf-renderer';
import { renderCvHtml } from '../../templates';
import { getCv } from '../cvs/cvs.service';

export async function getPreviewHtml(userId: string, cvId: string): Promise<string> {
  return renderCvHtml(await getCv(userId, cvId));
}

export interface CvPdf {
  pdf: Buffer;
  filename: string;
}

/** "Desarrolladora Frontend – Ana" → "desarrolladora-frontend-ana" */
export function toFilename(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${slug || 'cv'}.pdf`;
}

export async function getPdf(userId: string, cvId: string): Promise<CvPdf> {
  const cv = await getCv(userId, cvId);
  try {
    return {
      pdf: await renderPdf(renderCvHtml(cv)),
      filename: toFilename(cv.fullName || cv.title),
    };
  } catch (error) {
    console.error('PDF generation failed', error);
    throw new AppError(
      503,
      'PDF_GENERATION_FAILED',
      'No se ha podido generar el PDF. Inténtalo de nuevo en unos segundos.',
    );
  }
}

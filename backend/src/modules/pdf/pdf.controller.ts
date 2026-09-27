import type { Request, Response } from 'express';
import { getAuthUserId } from '../../middlewares/require-auth';
import * as pdfService from './pdf.service';

type CvRequest = Request<{ cvId: string }>;

export async function preview(req: CvRequest, res: Response): Promise<void> {
  const html = await pdfService.getPreviewHtml(getAuthUserId(res), req.params.cvId);
  res.set('Cache-Control', 'no-store').type('html').send(html);
}

export async function download(req: CvRequest, res: Response): Promise<void> {
  const { pdf, filename } = await pdfService.getPdf(getAuthUserId(res), req.params.cvId);
  res.set('Cache-Control', 'no-store').attachment(filename).type('application/pdf').send(pdf);
}

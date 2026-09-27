import type { Request, Response } from 'express';
import { getAuthUserId } from '../../middlewares/require-auth';
import type { CreateCvInput, UpdateCvInput } from './cvs.schema';
import * as cvsService from './cvs.service';

type CvRequest = Request<{ cvId: string }>;

export async function list(_req: Request, res: Response): Promise<void> {
  res.json({ cvs: await cvsService.listCvs(getAuthUserId(res)) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const cv = await cvsService.createCv(getAuthUserId(res), req.body as CreateCvInput);
  res.status(201).json({ cv });
}

export async function get(req: CvRequest, res: Response): Promise<void> {
  res.json({ cv: await cvsService.getCv(getAuthUserId(res), req.params.cvId) });
}

export async function update(req: CvRequest, res: Response): Promise<void> {
  const cv = await cvsService.updateCv(
    getAuthUserId(res),
    req.params.cvId,
    req.body as UpdateCvInput,
  );
  res.json({ cv });
}

export async function remove(req: CvRequest, res: Response): Promise<void> {
  await cvsService.deleteCv(getAuthUserId(res), req.params.cvId);
  res.status(204).end();
}

export async function duplicate(req: CvRequest, res: Response): Promise<void> {
  const cv = await cvsService.duplicateCv(getAuthUserId(res), req.params.cvId);
  res.status(201).json({ cv });
}

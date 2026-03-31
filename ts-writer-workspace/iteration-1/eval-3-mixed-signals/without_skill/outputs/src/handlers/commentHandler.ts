import { Request, Response } from 'express';
import { createCommentSchema, updateCommentSchema } from '../schemas/commentSchema';
import { CommentService, NotFoundError, ForbiddenError } from '../services/commentService';
import { ZodError } from 'zod';

const commentService = new CommentService();

export async function handleCreateComment(req: Request, res: Response) {
  try {
    const input = createCommentSchema.parse(req.body);
    const comment = await commentService.create(input);
    res.status(201).json({ data: comment });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
    } else {
      throw err;
    }
  }
}

export async function handleGetCommentsByResource(req: Request, res: Response) {
  const comments = await commentService.getByResource(req.params.resourceId);
  res.json({ data: comments });
}

export async function handleUpdateComment(req: Request, res: Response) {
  try {
    const input = updateCommentSchema.parse(req.body);
    const authorId = req.headers['x-user-id'] as string;
    if (!authorId) {
      res.status(401).json({ error: 'Missing x-user-id header' });
      return;
    }
    const comment = await commentService.update(req.params.id, authorId, input);
    res.json({ data: comment });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
    } else if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
    } else if (err instanceof ForbiddenError) {
      res.status(403).json({ error: err.message });
    } else {
      throw err;
    }
  }
}

export async function handleDeleteComment(req: Request, res: Response) {
  try {
    const authorId = req.headers['x-user-id'] as string;
    if (!authorId) {
      res.status(401).json({ error: 'Missing x-user-id header' });
      return;
    }
    await commentService.delete(req.params.id, authorId);
    res.status(204).send();
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
    } else if (err instanceof ForbiddenError) {
      res.status(403).json({ error: err.message });
    } else {
      throw err;
    }
  }
}

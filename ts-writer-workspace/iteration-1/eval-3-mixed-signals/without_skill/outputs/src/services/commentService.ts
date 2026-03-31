import { db } from '../db';
import type { CreateCommentInput, UpdateCommentInput } from '../schemas/commentSchema';

export interface Comment {
  id: string;
  body: string;
  authorId: string;
  resourceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CommentService {
  async create(input: CreateCommentInput): Promise<Comment> {
    const now = new Date();
    return db.comments.create({
      ...input,
      createdAt: now,
      updatedAt: now,
    });
  }

  async getByResource(resourceId: string): Promise<Comment[]> {
    return db.comments.findByResource(resourceId);
  }

  async getById(id: string): Promise<Comment | null> {
    return db.comments.findById(id);
  }

  async update(id: string, authorId: string, input: UpdateCommentInput): Promise<Comment> {
    const comment = await db.comments.findById(id);
    if (!comment) {
      throw new NotFoundError('Comment not found');
    }
    if (comment.authorId !== authorId) {
      throw new ForbiddenError('You can only edit your own comments');
    }
    return db.comments.update(id, { ...input, updatedAt: new Date() });
  }

  async delete(id: string, authorId: string): Promise<void> {
    const comment = await db.comments.findById(id);
    if (!comment) {
      throw new NotFoundError('Comment not found');
    }
    if (comment.authorId !== authorId) {
      throw new ForbiddenError('You can only delete your own comments');
    }
    await db.comments.delete(id);
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

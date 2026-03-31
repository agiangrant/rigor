import { Request, Response } from 'express';
import { createUserSchema, updateUserSchema } from '../schemas/userSchema';
import { UserService } from '../services/userService';
import { ZodError } from 'zod';

const userService = new UserService();

export async function handleCreateUser(req: Request, res: Response) {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await userService.create(input);
    res.status(201).json({ data: user });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
    } else {
      throw err;
    }
  }
}

export async function handleGetUser(req: Request, res: Response) {
  const user = await userService.getById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ data: user });
}

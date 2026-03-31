import { Router } from 'express';
import { UserService } from '../services/userService';

const router = Router();

router.get('/users', async (req, res) => {
  const users = await UserService.list();
  res.json(users);
});

router.get('/users/:id', async (req, res) => {
  const user = await UserService.findById(req.params.id);
  res.json(user);
});

router.post('/users', async (req, res) => {
  const user = await UserService.create(req.body);
  res.status(201).json(user);
});

export { router as userRoutes };

import { Router } from 'express';
import { OrderService } from '../services/orderService';

const router = Router();

router.get('/orders', async (req, res) => {
  const orders = await OrderService.list();
  res.json(orders);
});

router.post('/orders', async (req, res) => {
  const order = await OrderService.create(req.body);
  res.status(201).json(order);
});

export { router as orderRoutes };

import { Router } from 'express';
import { PaymentService } from '../services/paymentService';

const router = Router();

router.get('/payments', async (req, res) => {
  const userId = req.query.userId as string;
  const payments = await PaymentService.listByUser(userId);
  res.json(payments);
});

router.post('/payments', async (req, res) => {
  const payment = await PaymentService.create(req.body);
  res.status(201).json(payment);
});

export { router as paymentRoutes };

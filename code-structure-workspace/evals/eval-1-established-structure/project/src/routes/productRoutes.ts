import { Router } from 'express';
import { ProductService } from '../services/productService';

const router = Router();

router.get('/products', async (req, res) => {
  const products = await ProductService.list();
  res.json(products);
});

router.get('/products/:id', async (req, res) => {
  const product = await ProductService.findById(req.params.id);
  res.json(product);
});

export { router as productRoutes };

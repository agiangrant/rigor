import { db } from './db';
import { cacheGet, cacheSet, cacheDelete } from './cache';

export class ProductService {
  async getProduct(id: string) {
    const cached = cacheGet(`product:${id}`);
    if (cached) return cached;
    const product = await db.products.findById(id);
    if (product) cacheSet(`product:${id}`, product);
    return product;
  }

  async listProducts() {
    const cached = cacheGet('products:all');
    if (cached) return cached;
    const products = await db.products.findAll();
    cacheSet('products:all', products);
    return products;
  }

  async updateProduct(id: string, data: any) {
    const product = await db.products.update(id, data);
    cacheDelete(`product:${id}`);
    cacheDelete('products:all');
    return product;
  }
}

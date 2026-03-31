import { db } from './db';
import { Cache } from './cache';

interface Product {
  id: string;
  name: string;
  [key: string]: any;
}

const cache = new Cache<Product>({ ttlMs: 300_000, maxSize: 500 });
const listCache = new Cache<Product[]>({ ttlMs: 60_000, maxSize: 1 });

export class ProductService {
  async getProduct(id: string) {
    const cached = cache.get(id);
    if (cached) return cached;
    const product = await db.products.findById(id);
    if (product) cache.set(id, product);
    return product;
  }

  async listProducts() {
    const cached = listCache.get('all');
    if (cached) return cached;
    const products = await db.products.findAll();
    listCache.set('all', products);
    return products;
  }

  async updateProduct(id: string, data: any) {
    const product = await db.products.update(id, data);
    cache.delete(id);
    listCache.clear();
    return product;
  }
}

import { Router } from 'express';
import { getProducts, getProductsSchema } from '../controllers/product.controller.js';
import { validate } from '../middlewares/validate.js';
const router = Router();
router.get('/products', validate(getProductsSchema), getProducts);
export default router;

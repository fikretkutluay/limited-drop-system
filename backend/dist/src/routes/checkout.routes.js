import { Router } from 'express';
import { processCheckout, checkoutSchema } from '../controllers/checkout.controller.js';
import { validate } from '../middlewares/validate.js';
const router = Router();
router.post('/checkout', validate(checkoutSchema), processCheckout);
export default router;

import { Router } from 'express';
import { reserveProduct, reserveSchema } from '../controllers/reservation.controller.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

router.post('/reserve', validate(reserveSchema), reserveProduct);

export default router;
import { Router } from 'express';
import { register, login, authSchema } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
const router = Router();
router.post('/register', validate(authSchema), register);
router.post('/login', validate(authSchema), login);
export default router;

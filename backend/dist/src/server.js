import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { startCronJobs } from './services/cron.service.js';
import { requestLogger } from './middlewares/logger.js';
import reservationRoutes from './routes/reservation.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import productRoutes from './routes/product.routes.js';
import authRoutes from './routes/auth.routes.js';
const app = express();
const PORT = process.env.PORT || 3000;
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/metrics', (req, res) => {
    res.status(200).json({
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: Date.now()
    });
});
app.use('/api', reservationRoutes);
app.use('/api', checkoutRoutes);
app.use('/api', productRoutes);
app.use('/api', authRoutes);
app.use((err, req, res, next) => {
    console.error(JSON.stringify({
        level: 'error',
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
    }));
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});
startCronJobs();
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

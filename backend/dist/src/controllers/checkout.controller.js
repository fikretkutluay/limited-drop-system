import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
export const checkoutSchema = z.object({
    body: z.object({
        reservationId: z.string().uuid(),
        userId: z.string().uuid()
    })
});
export const processCheckout = async (req, res, next) => {
    try {
        const { reservationId, userId } = req.body;
        const order = await prisma.$transaction(async (tx) => {
            const reservation = await tx.reservation.findUnique({
                where: { id: reservationId }
            });
            if (!reservation) {
                throw new Error('Reservation not found');
            }
            if (reservation.userId !== userId) {
                throw new Error('Unauthorized');
            }
            if (reservation.status !== 'PENDING') {
                throw new Error(`Reservation is already ${reservation.status}`);
            }
            if (new Date() > reservation.expiresAt) {
                throw new Error('Reservation has expired');
            }
            await tx.reservation.update({
                where: { id: reservationId },
                data: { status: 'COMPLETED' }
            });
            const newOrder = await tx.order.create({
                data: {
                    reservationId,
                    userId
                }
            });
            return newOrder;
        });
        res.status(200).json({ orderId: order.id });
    }
    catch (error) {
        next(error);
    }
};

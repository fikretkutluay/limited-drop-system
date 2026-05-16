import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
export const reserveSchema = z.object({
    body: z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        userId: z.string().uuid()
    })
});
export const reserveProduct = async (req, res, next) => {
    try {
        const { productId, quantity, userId } = req.body;
        const reservation = await prisma.$transaction(async (tx) => {
            const existingReservation = await tx.reservation.findFirst({
                where: {
                    userId,
                    productId,
                    status: 'PENDING',
                }
            });
            if (existingReservation) {
                throw new Error('You already have an active reservation for this product');
            }
            const product = await tx.product.findUnique({
                where: { id: productId }
            });
            if (!product || product.stock < quantity) {
                throw new Error('Product not found or insufficient stock');
            }
            const updateResult = await tx.product.updateMany({
                where: {
                    id: productId,
                    version: product.version
                },
                data: {
                    stock: product.stock - quantity,
                    version: product.version + 1
                }
            });
            if (updateResult.count === 0) {
                throw new Error('Concurrent update failed');
            }
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
            const newReservation = await tx.reservation.create({
                data: {
                    userId,
                    productId,
                    quantity,
                    expiresAt,
                    status: 'PENDING'
                }
            });
            await tx.inventoryLog.create({
                data: {
                    productId,
                    change: -quantity,
                    reason: 'RESERVATION_CREATED'
                }
            });
            return newReservation;
        });
        res.status(201).json({ reservationId: reservation.id });
    }
    catch (error) {
        next(error);
    }
};

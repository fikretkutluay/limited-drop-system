import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
export const startCronJobs = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const expiredReservations = await prisma.reservation.findMany({
                where: {
                    status: 'PENDING',
                    expiresAt: { lt: new Date() }
                }
            });
            for (const reservation of expiredReservations) {
                await prisma.$transaction(async (tx) => {
                    const currentReservation = await tx.reservation.findUnique({
                        where: { id: reservation.id }
                    });
                    if (currentReservation?.status !== 'PENDING')
                        return;
                    await tx.reservation.update({
                        where: { id: reservation.id },
                        data: { status: 'EXPIRED' }
                    });
                    const product = await tx.product.findUnique({
                        where: { id: reservation.productId }
                    });
                    if (product) {
                        await tx.product.update({
                            where: { id: product.id },
                            data: {
                                stock: product.stock + reservation.quantity,
                                version: product.version + 1
                            }
                        });
                    }
                    await tx.inventoryLog.create({
                        data: {
                            productId: reservation.productId,
                            change: reservation.quantity,
                            reason: 'RESERVATION_EXPIRED'
                        }
                    });
                });
            }
        }
        catch (error) {
            console.error('Cron job error:', error);
        }
    });
};

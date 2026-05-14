import request from 'supertest';
import { app } from '../server';
import { prisma } from '../lib/prisma';

describe('Reservation and Concurrency Tests', () => {
  let productId: string;
  let userId1: string;
  let userId2: string;

  beforeAll(async () => {
    // Clean up
    await prisma.order.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.inventoryLog.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // Setup mock data
    const user1 = await prisma.user.create({
      data: { email: 'test1@example.com', password: 'password' },
    });
    const user2 = await prisma.user.create({
      data: { email: 'test2@example.com', password: 'password' },
    });
    
    userId1 = user1.id;
    userId2 = user2.id;
  });

  beforeEach(async () => {
    await prisma.order.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.inventoryLog.deleteMany();
    await prisma.product.deleteMany();

    const product = await prisma.product.create({
      data: {
        name: 'Limited Sneaker',
        stock: 5,
        version: 1,
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should successfully reserve a product and reduce stock', async () => {
    const res = await request(app)
      .post('/api/reserve')
      .send({
        productId,
        quantity: 1,
        userId: userId1,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('reservationId');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(4);
  });

  it('should prevent duplicate active reservations for the same user', async () => {
    await request(app).post('/api/reserve').send({ productId, quantity: 1, userId: userId1 });
    
    const duplicateRes = await request(app)
      .post('/api/reserve')
      .send({ productId, quantity: 1, userId: userId1 });

    expect(duplicateRes.status).toBe(500);
    expect(duplicateRes.body.error).toContain('You already have an active reservation');
  });

  it('should expire reservations via cron logic', async () => {
    // 1. Reserve product
    const res = await request(app).post('/api/reserve').send({ productId, quantity: 1, userId: userId1 });
    const reservationId = res.body.reservationId;

    // 2. Force expire the reservation in DB
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { expiresAt: new Date(Date.now() - 10000) } // past
    });

    // 3. Run the cron service logic manually for testing
    const expiredReservations = await prisma.reservation.findMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } }
    });

    for (const reservation of expiredReservations) {
      await prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'EXPIRED' }
        });
        const product = await tx.product.findUnique({ where: { id: reservation.productId } });
        if (product) {
          await tx.product.update({
            where: { id: product.id },
            data: { stock: product.stock + reservation.quantity, version: product.version + 1 }
          });
        }
      });
    }

    // 4. Assert stock restored
    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(5);

    const updatedRes = await prisma.reservation.findUnique({ where: { id: reservationId } });
    expect(updatedRes?.status).toBe('EXPIRED');
  });

  it('should handle concurrent reservation requests safely (prevent overselling)', async () => {
    // Set stock to 1
    await prisma.product.update({
      where: { id: productId },
      data: { stock: 1 }
    });

    // Simulate 5 users trying to reserve the same 1 stock at the same time
    const userIds = [userId1, userId2];
    // Create 3 more users just for this test
    for (let i = 0; i < 3; i++) {
      const u = await prisma.user.create({ data: { email: `test_concurrency_${i}@example.com`, password: 'password' } });
      userIds.push(u.id);
    }

    const requests = userIds.map(uid => 
      request(app).post('/api/reserve').send({ productId, quantity: 1, userId: uid })
    );

    const responses = await Promise.all(requests);

    const successes = responses.filter(r => r.status === 201);
    const failures = responses.filter(r => r.status === 500);

    // Only 1 should succeed
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(4);

    const finalProduct = await prisma.product.findUnique({ where: { id: productId } });
    expect(finalProduct?.stock).toBe(0);
  });
});

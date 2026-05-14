import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'dev.db');
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const demoUserId = '123e4567-e89b-12d3-a456-426614174000';
  const demoProductId = '223e4567-e89b-12d3-a456-426614174000';

  try {
    await prisma.user.upsert({
      where: { id: demoUserId },
      update: {
        email: 'testuser@example.com',
        password: 'hashedpassword123'
      },
      create: {
        id: demoUserId,
        email: 'testuser@example.com',
        password: 'hashedpassword123'
      }
    });

    await prisma.product.upsert({
      where: { id: demoProductId },
      update: {
        name: 'Limited Edition Sneaker',
        stock: 5,
        version: 1
      },
      create: {
        id: demoProductId,
        name: 'Limited Edition Sneaker',
        stock: 5,
        version: 1
      }
    });

    console.log('✅ Test verileri başarıyla eklendi!');
  } catch (error) {
    console.error('Hata:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const getProductsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional().default('1'),
    limit: z.string().regex(/^\d+$/).optional().default('10'),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'stock', 'name']).optional().default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc')
  })
});

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = ((res.locals as any).validated?.query as {
      page?: string;
      limit?: string;
      search?: string;
      sortBy?: 'createdAt' | 'stock' | 'name';
      order?: 'asc' | 'desc';
    }) ?? (req.query as {
      page?: string;
      limit?: string;
      search?: string;
      sortBy?: 'createdAt' | 'stock' | 'name';
      order?: 'asc' | 'desc';
    });

    const pageNumber = Number.isInteger(Number(query.page)) ? parseInt(query.page!, 10) : 1;
    const limitNumber = Number.isInteger(Number(query.limit)) ? parseInt(query.limit!, 10) : 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const order = query.order ?? 'desc';
    const skip = (pageNumber - 1) * limitNumber;

    const whereClause = query.search ? { name: { contains: query.search } } : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        skip,
        take: limitNumber,
        orderBy: { [sortBy]: order }
      }),
      prisma.product.count({ where: whereClause })
    ]);

    res.status(200).json({
      data: products,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    next(error);
  }
};
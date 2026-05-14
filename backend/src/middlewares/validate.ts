import { ZodTypeAny } from 'zod';
import type { Request, Response, NextFunction } from 'express';

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const result = await schema.safeParseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return res.status(400).json({
        message: 'Validation failed',
        issues: result.error.issues,
      });
    }

    const parsed = result.data as { body: unknown; query: unknown; params: unknown };

    req.body = parsed.body;
    req.params = parsed.params;
    res.locals.validated = parsed;

    next();
  };
};
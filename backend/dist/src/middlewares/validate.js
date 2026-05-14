export const validate = (schema) => {
    return async (req, res, next) => {
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
        const parsed = result.data;
        req.body = parsed.body;
        req.params = parsed.params;
        res.locals.validated = parsed;
        next();
    };
};

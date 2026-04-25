// src/middleware/validate.js
// Generic Zod schema validation middleware

export const validate = (schema, type = 'body') => (req, res, next) => {
  try {
    const result = schema.safeParse(req[type]);
    if (!result.success) {
      return res.status(400).json({
        error: `Validation failed in ${type}`,
        details: result.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    // Update the request object with the parsed (and possibly coerced/transformed) data
    req[type] = result.data;
    next();
  } catch (err) {
    next(err);
  }
};

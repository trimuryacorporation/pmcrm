import { validationResult } from 'express-validator';

export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  res.status(422);
  next({ message: 'Validation failed', errors: result.array() });
}

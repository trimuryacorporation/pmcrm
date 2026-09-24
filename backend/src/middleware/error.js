export function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
}

function duplicateKeyMessage(err) {
  if (err.code !== 11000) return null;

  const fields = Object.keys(err.keyValue || err.keyPattern || {});
  if (!fields.length) return 'This record already exists';

  const labels = {
    code: 'Project code',
    email: 'Email',
    employeeId: 'Employee ID',
    invoiceNumber: 'Invoice number',
    key: 'Setting key'
  };
  const field = fields[0];
  const label = labels[field] || field;
  const value = err.keyValue?.[field];

  return value ? `${label} "${value}" already exists` : `${label} already exists`;
}

export function errorHandler(err, req, res, next) {
  const duplicateMessage = duplicateKeyMessage(err);
  const statusCode = duplicateMessage ? 409 : err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  res.status(statusCode).json({
    message: duplicateMessage || err.message || 'Server error',
    errors: err.errors || undefined,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
}

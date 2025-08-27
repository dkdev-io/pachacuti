/**
 * Error Handler Middleware
 * Centralized error handling for the Express application
 */

/**
 * Main error handling middleware
 * Must be placed after all routes and other middleware
 */
export function errorHandler(err, req, res, next) {
  // Log the error for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details || err.message;
  } else if (err.name === 'UnauthorizedError' || err.message.includes('jwt')) {
    statusCode = 401;
    message = 'Unauthorized';
    details = 'Invalid or expired token';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not Found';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    message = 'Conflict';
  } else if (err.name === 'TooManyRequestsError') {
    statusCode = 429;
    message = 'Too Many Requests';
  } else if (err.name === 'PaymentRequiredError') {
    statusCode = 402;
    message = 'Payment Required';
  }

  // Handle MongoDB/Database errors
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate Error';
    details = 'Resource already exists';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID';
    details = 'Invalid resource identifier';
  }

  // Handle Supabase errors
  if (err.code === 'PGRST116') {
    statusCode = 404;
    message = 'Not Found';
    details = 'Resource not found';
  } else if (err.code === '23505') {
    statusCode = 409;
    message = 'Conflict';
    details = 'Resource already exists';
  } else if (err.code === '23503') {
    statusCode = 400;
    message = 'Bad Request';
    details = 'Foreign key constraint violation';
  }

  // Handle Web3/Ethereum errors
  if (err.message.includes('insufficient funds')) {
    statusCode = 402;
    message = 'Insufficient Funds';
    details = 'Insufficient balance for transaction';
  } else if (err.message.includes('gas')) {
    statusCode = 400;
    message = 'Transaction Error';
    details = 'Gas estimation failed or insufficient gas';
  } else if (err.message.includes('nonce')) {
    statusCode = 400;
    message = 'Transaction Error';
    details = 'Invalid transaction nonce';
  }

  // Handle timeout errors
  if (err.message.includes('timeout')) {
    statusCode = 408;
    message = 'Request Timeout';
    details = 'Request took too long to process';
  }

  // Handle rate limiting errors
  if (err.message.includes('rate limit')) {
    statusCode = 429;
    message = 'Too Many Requests';
    details = 'Rate limit exceeded';
  }

  // Don't expose stack traces in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    error: message,
    message: details || err.message || message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add additional debug info in development
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }

  // Add request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 * Should be placed after all routes but before error handler
 */
export function notFoundHandler(req, res, next) {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.name = 'NotFoundError';
  error.statusCode = 404;
  next(error);
}

/**
 * Async error wrapper for route handlers
 */
export function wrapAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create custom error classes
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too Many Requests') {
    super(message, 429);
    this.name = 'TooManyRequestsError';
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = 'Payment Required') {
    super(message, 402);
    this.name = 'PaymentRequiredError';
  }
}

/**
 * Global unhandled rejection handler
 */
export function handleUnhandledRejection() {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
  });
}

/**
 * Global uncaught exception handler
 */
export function handleUncaughtException() {
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
    process.exit(1);
  });
}
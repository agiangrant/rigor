export class AppError extends Error {
  constructor(message: string, public readonly code: string, public readonly statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) { super(`${resource} not found: ${id}`, 'NOT_FOUND', 404); }
}
export class ValidationError extends AppError {
  constructor(message: string) { super(message, 'VALIDATION_ERROR', 400); }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(message, 'CONFLICT', 409); }
}

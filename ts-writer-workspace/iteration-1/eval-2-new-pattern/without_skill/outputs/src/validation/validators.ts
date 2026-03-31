import { ValidationError } from './errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_ROLES = ['admin', 'member'] as const;

export function validateEmail(email: string): ValidationError | null {
  if (!email || email.trim().length === 0) {
    return new ValidationError('email', 'Email is required');
  }
  if (!EMAIL_REGEX.test(email)) {
    return new ValidationError('email', 'Email format is invalid');
  }
  return null;
}

export function validateNonEmpty(field: string, value: string): ValidationError | null {
  if (!value || value.trim().length === 0) {
    return new ValidationError(field, `${field} is required`);
  }
  return null;
}

export function validateRole(role: string): ValidationError | null {
  if (!VALID_ROLES.includes(role as any)) {
    return new ValidationError(
      'role',
      `Role must be one of: ${VALID_ROLES.join(', ')}`,
    );
  }
  return null;
}

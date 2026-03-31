import { describe, it, expect } from 'vitest';
import { validateEmail, validateNonEmpty, validateRole } from '../validators';

describe('validateEmail', () => {
  it('returns null for a valid email', () => {
    expect(validateEmail('user@example.com')).toBeNull();
  });

  it('returns error for empty string', () => {
    const err = validateEmail('');
    expect(err).not.toBeNull();
    expect(err!.field).toBe('email');
    expect(err!.message).toBe('Email is required');
  });

  it('returns error for whitespace-only string', () => {
    const err = validateEmail('   ');
    expect(err).not.toBeNull();
    expect(err!.field).toBe('email');
  });

  it('returns error for missing @', () => {
    const err = validateEmail('userexample.com');
    expect(err).not.toBeNull();
    expect(err!.message).toBe('Email format is invalid');
  });

  it('returns error for missing domain', () => {
    const err = validateEmail('user@');
    expect(err).not.toBeNull();
  });

  it('returns error for missing local part', () => {
    const err = validateEmail('@example.com');
    expect(err).not.toBeNull();
  });

  it('returns error for spaces in email', () => {
    const err = validateEmail('user @example.com');
    expect(err).not.toBeNull();
  });
});

describe('validateNonEmpty', () => {
  it('returns null for non-empty string', () => {
    expect(validateNonEmpty('name', 'Alice')).toBeNull();
  });

  it('returns error for empty string', () => {
    const err = validateNonEmpty('name', '');
    expect(err).not.toBeNull();
    expect(err!.field).toBe('name');
    expect(err!.message).toBe('name is required');
  });

  it('returns error for whitespace-only string', () => {
    const err = validateNonEmpty('name', '   ');
    expect(err).not.toBeNull();
  });

  it('uses the field name in the error', () => {
    const err = validateNonEmpty('title', '');
    expect(err).not.toBeNull();
    expect(err!.field).toBe('title');
    expect(err!.message).toBe('title is required');
  });
});

describe('validateRole', () => {
  it('returns null for admin', () => {
    expect(validateRole('admin')).toBeNull();
  });

  it('returns null for member', () => {
    expect(validateRole('member')).toBeNull();
  });

  it('returns error for unknown role', () => {
    const err = validateRole('superuser');
    expect(err).not.toBeNull();
    expect(err!.field).toBe('role');
    expect(err!.message).toBe('Role must be one of: admin, member');
  });

  it('returns error for empty string', () => {
    const err = validateRole('');
    expect(err).not.toBeNull();
  });

  it('is case-sensitive', () => {
    const err = validateRole('Admin');
    expect(err).not.toBeNull();
  });
});

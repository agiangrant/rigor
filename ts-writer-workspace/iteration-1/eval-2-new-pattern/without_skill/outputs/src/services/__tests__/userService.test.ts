import { describe, it, expect } from 'vitest';
import { UserService } from '../userService';
import { ValidationError } from '../../validation';

describe('UserService.create', () => {
  const service = new UserService();

  it('creates a user with valid input', async () => {
    const user = await service.create('Alice', 'alice@example.com', 'member');
    expect(user).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com',
      role: 'member',
    });
    expect(user.id).toBeDefined();
  });

  it('throws ValidationError for empty name', async () => {
    await expect(service.create('', 'alice@example.com', 'member'))
      .rejects.toThrow(ValidationError);
    await expect(service.create('', 'alice@example.com', 'member'))
      .rejects.toThrow('name is required');
  });

  it('throws ValidationError for invalid email', async () => {
    await expect(service.create('Alice', 'not-an-email', 'member'))
      .rejects.toThrow(ValidationError);
    await expect(service.create('Alice', 'not-an-email', 'member'))
      .rejects.toThrow('Email format is invalid');
  });

  it('throws ValidationError for empty email', async () => {
    await expect(service.create('Alice', '', 'member'))
      .rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for invalid role', async () => {
    await expect(service.create('Alice', 'alice@example.com', 'superuser'))
      .rejects.toThrow(ValidationError);
    await expect(service.create('Alice', 'alice@example.com', 'superuser'))
      .rejects.toThrow('Role must be one of: admin, member');
  });

  it('reports the first validation error when multiple fields are invalid', async () => {
    await expect(service.create('', 'bad', 'nope'))
      .rejects.toThrow('name is required');
  });
});

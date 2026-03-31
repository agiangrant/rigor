import { describe, it, expect } from 'vitest';
import { generateSlug, isValidSlug } from '../services/slugService';

describe('generateSlug', () => {
  it('converts title to lowercase kebab-case', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(generateSlug('Hello, World! (2024)')).toBe('hello-world-2024');
  });

  it('collapses multiple spaces and dashes', () => {
    expect(generateSlug('hello   ---   world')).toBe('hello-world');
  });

  it('trims leading and trailing dashes', () => {
    expect(generateSlug('  --hello world--  ')).toBe('hello-world');
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(generateSlug('!@#$%')).toBe('');
  });

  it('replaces underscores with dashes', () => {
    expect(generateSlug('hello_world_test')).toBe('hello-world-test');
  });
});

describe('isValidSlug', () => {
  it('accepts valid slugs', () => {
    expect(isValidSlug('hello-world')).toBe(true);
    expect(isValidSlug('post-123')).toBe(true);
    expect(isValidSlug('a')).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('Hello-World')).toBe(false);
    expect(isValidSlug('-leading-dash')).toBe(false);
    expect(isValidSlug('trailing-dash-')).toBe(false);
    expect(isValidSlug('double--dash')).toBe(false);
    expect(isValidSlug('has spaces')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, parseDate } from '../utils/formatDate';

describe('formatDate', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(formatDate(new Date('2024-03-15T10:30:00Z'))).toBe('2024-03-15');
  });
});

describe('formatDateTime', () => {
  it('formats date with time', () => {
    expect(formatDateTime(new Date('2024-03-15T10:30:00Z'))).toBe('2024-03-15 10:30:00');
  });
});

describe('parseDate', () => {
  it('parses date string', () => {
    const date = parseDate('2024-03-15');
    expect(date.getFullYear()).toBe(2024);
  });
});

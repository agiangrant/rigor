import { describe, it, expect, vi } from 'vitest';
import { TokenService } from '../services/tokenService';

describe('TokenService', () => {
  const service = new TokenService();

  describe('generate', () => {
    it('returns a token and expiry', () => {
      const result = service.generate('user-1');
      expect(result.token).toBeDefined();
      expect(result.token).toContain('.');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('verify', () => {
    it('verifies a valid token', () => {
      const { token } = service.generate('user-1');
      const result = service.verify(token);
      expect(result).toEqual({ userId: 'user-1' });
    });

    it('returns null for invalid signature', () => {
      const { token } = service.generate('user-1');
      const tampered = token.slice(0, -4) + 'xxxx';
      expect(service.verify(tampered)).toBeNull();
    });

    it('returns null for expired token', () => {
      vi.useFakeTimers();
      const { token } = service.generate('user-1');
      vi.advanceTimersByTime(3600001); // 1 hour + 1ms
      expect(service.verify(token)).toBeNull();
      vi.useRealTimers();
    });

    it('returns null for malformed token', () => {
      expect(service.verify('not-a-valid-token')).toBeNull();
    });
  });
});

# Code Review: Token Service and Auth Middleware

## Files Reviewed

- `src/services/tokenService.ts`
- `src/middleware/auth.ts`
- `src/__tests__/tokenService.test.ts`

---

## Critical Issues

### 1. Timing-safe comparison not used for signature verification

**File:** `src/services/tokenService.ts`, line 37

The code compares signatures with `===`, which is vulnerable to timing attacks. An attacker can measure response times to incrementally guess a valid signature byte-by-byte. The code even has a comment acknowledging this: `// NOT timing-safe!`

**Fix:** Use `crypto.timingSafeEqual` to compare the signature:

```ts
const expected = Buffer.from(expectedSignature, 'hex');
const actual = Buffer.from(signature, 'hex');
if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
```

### 2. Hardcoded fallback secret

**File:** `src/services/tokenService.ts`, line 4

```ts
const SECRET = process.env.TOKEN_SECRET || 'default-secret-change-me';
```

If `TOKEN_SECRET` is not set, the service silently falls back to a publicly-known string. This means tokens are trivially forgeable in any environment where the env var is missing (staging, CI, a misconfigured production deploy). The service should throw at startup if the secret is not configured, rather than silently degrading to an insecure default.

### 3. Uncaught JSON.parse exception on malformed payload

**File:** `src/services/tokenService.ts`, line 39

If an attacker sends a token where the base64 portion decodes to something that is not valid JSON, `JSON.parse(payload)` will throw an unhandled exception. This crashes the request (or worse, the process) instead of returning `null`.

**Fix:** Wrap the parse and field access in a try/catch:

```ts
try {
  const data = JSON.parse(payload);
  if (data.exp < Date.now()) return null;
  return { userId: data.userId };
} catch {
  return null;
}
```

---

## Moderate Issues

### 4. Module-level singleton in middleware hides dependency

**File:** `src/middleware/auth.ts`, line 3

`const tokenService = new TokenService();` is instantiated at module load time. This makes the middleware impossible to test with a mock/stub `TokenService`, and it couples the middleware tightly to one concrete implementation. Accept `TokenService` via a factory or parameter instead:

```ts
export function createAuthMiddleware(tokenService: TokenService) {
  return (req: any, res: any, next: any) => { ... };
}
```

### 5. No token revocation mechanism

There is no way to invalidate a token before it expires. If a user's credentials are compromised, every token issued to them remains valid for up to an hour. Consider a lightweight revocation list (e.g., a Set of revoked token nonces checked during `verify`), or shorten token expiry and pair with a refresh token flow.

### 6. Secret is a module-level constant -- no rotation possible

`SECRET` is read once at import time. If you need to rotate secrets (and you will), you cannot do so without restarting the process. Making the secret a parameter of `TokenService` (injected via constructor) would allow rotation and also make testing easier.

---

## Minor Issues

### 7. `expiresAt` is computed independently from the payload `exp`

**File:** `src/services/tokenService.ts`, lines 10 and 22

`exp` inside the payload and `expiresAt` in the return value both call `Date.now()` separately. Under load or if the event loop is delayed, these can differ by a few milliseconds. Capture `Date.now()` once at the top of `generate` and derive both values from it.

### 8. No type definitions on middleware parameters

**File:** `src/middleware/auth.ts`, line 5

`req: any, res: any, next: any` discards all type safety. Use Express's `Request`, `Response`, and `NextFunction` types (or the equivalent from your framework) and extend `Request` to include the `user` property.

### 9. Base64 payload can contain `.` characters

The token format is `base64(payload).signature`, split on `.`. Standard base64 does not include `.`, but if the encoding were ever changed to base64url or a different scheme, the split could break. This is not an active bug, but documenting the format contract or using a delimiter that cannot appear in either part (like `~`) would be more robust.

---

## Test Coverage Assessment

The tests cover the happy path and the main failure modes (invalid signature, expired token, malformed token). Good use of `vi.useFakeTimers()` for the expiry test.

**Gaps:**

- No test for the `JSON.parse` crash path (e.g., token with valid base64 that is not JSON). This would expose issue #3.
- No test for the auth middleware at all. Header parsing, missing header, expired token passthrough, and `req.user` assignment are all untested.
- No test for empty `userId` or missing fields in the payload.

---

## Summary

The overall structure is reasonable -- the token format is simple, generation and verification are co-located, and the middleware is thin. The three critical issues (timing-unsafe comparison, hardcoded fallback secret, uncaught parse exception) should be addressed before shipping. The secret management and dependency injection concerns are important for production readiness but less urgent.

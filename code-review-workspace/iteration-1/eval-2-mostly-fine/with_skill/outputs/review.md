# Code Review: Token Service and Auth Middleware

## Context

Hand-rolled HMAC token generation and verification service with Express auth middleware. The scope is a custom token system: `TokenService` generates and verifies `payload.signature` tokens using HMAC-SHA256, and `authMiddleware` gates routes using Bearer token authentication.

Three files: `src/services/tokenService.ts`, `src/middleware/auth.ts`, `src//__tests__/tokenService.test.ts`.

---

## Blocking

### 1. Timing-safe comparison not used for signature verification

**What**: `tokenService.ts:37` compares signatures with `===`, which is vulnerable to timing attacks. The code even has a comment acknowledging this: `// NOT timing-safe!`.

**Why**: String equality via `===` short-circuits on the first differing byte. An attacker can measure response times to progressively guess the correct signature one character at a time. For HMAC signature verification this is a textbook vulnerability.

**How**: Replace with `crypto.timingSafeEqual`:

```ts
const sigBuffer = Buffer.from(signature, 'hex');
const expectedBuffer = Buffer.from(expectedSignature, 'hex');
if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
  return null;
}
```

### 2. Hardcoded fallback secret

**What**: `tokenService.ts:4` falls back to `'default-secret-change-me'` when `TOKEN_SECRET` is not set.

**Why**: If the environment variable is missing (deployment misconfiguration, local dev without `.env`), the service silently runs with a known, guessable secret. Anyone can forge tokens. This should fail loudly rather than run insecurely.

**How**: Throw at startup if the secret is missing:

```ts
const SECRET = process.env.TOKEN_SECRET;
if (!SECRET) {
  throw new Error('TOKEN_SECRET environment variable is required');
}
```

### 3. `JSON.parse` in `verify` is unguarded

**What**: `tokenService.ts:39` calls `JSON.parse(payload)` without a try/catch. A token with a valid HMAC but corrupted base64 that decodes to non-JSON will throw an unhandled exception.

**Why**: While the HMAC check runs first (so an attacker can't craft arbitrary payloads without the secret), a malformed token where the base64 portion decodes to something that isn't valid JSON but the split still produces two parts will crash the process. More practically, if the secret ever leaks or during testing with crafted inputs, this is an unhandled throw in middleware-adjacent code -- it will 500 instead of 401.

**How**: Wrap the parse and field access in a try/catch that returns `null`:

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

## Should Fix

### 4. No validation that `userId` exists in the parsed payload

**What**: `tokenService.ts:42` returns `{ userId: data.userId }` without checking that `data.userId` is a string (or even defined).

**Why**: If someone generates a token with a missing or non-string `userId` (or if the payload schema evolves), `verify` will happily return `{ userId: undefined }`, which downstream code will treat as an authenticated user with no identity. This is a silent failure mode.

**How**: After parsing, validate: `if (typeof data.userId !== 'string') return null;`

### 5. `authMiddleware` uses `any` for all parameters

**What**: `auth.ts:5` types `req`, `res`, and `next` as `any`.

**Why**: This eliminates all type safety for the middleware. Typos in `req.headers.authorization` or `res.status` won't be caught at compile time. Express ships `Request`, `Response`, `NextFunction` types -- use them. Additionally, augmenting `req.user` should be done through declaration merging or a typed wrapper, not silent mutation of an `any` object.

**How**: Import Express types and use them:

```ts
import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
```

### 6. `TokenService` is instantiated as a module-level singleton in middleware

**What**: `auth.ts:3` creates `const tokenService = new TokenService()` at module scope.

**Why**: This makes the middleware untestable in isolation -- you cannot inject a mock or differently-configured `TokenService`. It also means the secret is captured at import time, so if the environment variable changes after module load, the middleware won't pick it up (unlikely in practice, but a design smell). The service itself is stateless, so there's no reason to couple it this tightly.

**How**: Accept the `TokenService` as a parameter (factory pattern) or use dependency injection:

```ts
export function createAuthMiddleware(tokenService: TokenService) {
  return (req: Request, res: Response, next: NextFunction) => { ... };
}
```

### 7. `expiresAt` is computed twice with a potential drift

**What**: `tokenService.ts:10` computes `Date.now() + TOKEN_EXPIRY_MS` for the payload, and `tokenService.ts:20` computes `Date.now() + TOKEN_EXPIRY_MS` again for the return value.

**Why**: These two calls to `Date.now()` can differ by milliseconds. The expiry embedded in the token and the expiry returned to the caller will not match. This is minor but indicates sloppy time handling -- capture `Date.now()` once and reuse it.

**How**:

```ts
const now = Date.now();
const expiresAt = now + TOKEN_EXPIRY_MS;
// use `expiresAt` in both the payload and the return value
```

---

## Consider

### 8. No tests for the auth middleware

**What**: `auth.ts` has no test file. Only `TokenService` is tested.

**Why**: The middleware has its own logic -- header parsing, the `Bearer ` prefix check, setting `req.user`, calling `next()`. None of this is tested. If someone changes the header parsing or the error response format, there's no test to catch it.

**How**: Add a test file for `authMiddleware` covering: missing header, malformed header (no `Bearer ` prefix), invalid token, expired token, and valid token (verifying `req.user` is set and `next` is called).

### 9. Token format uses non-URL-safe base64

**What**: `tokenService.ts:18` uses `Buffer.from(payload).toString('base64')`, which produces standard base64 with `+`, `/`, and `=` characters.

**Why**: If these tokens ever travel in URLs (query parameters, redirects), the `+` and `/` characters will cause issues without additional encoding. This may not matter today, but it's a common source of subtle bugs when token usage expands. `base64url` encoding avoids this.

**How**: Use `toString('base64url')` and `Buffer.from(payloadB64, 'base64url')` if the runtime supports it (Node 15.7+), or a utility function.

### 10. Test assertions on `generate` are weak

**What**: `tokenService.test.ts:11` asserts `expect(result.token).toBeDefined()` and `toContain('.')`. These prove almost nothing about the token's structure or content.

**Why**: A test that asserts only "the token exists and has a dot" would pass for the string `"a.b"`. It doesn't verify the payload is valid base64, that it contains the correct userId, or that the signature is the right length. The verify round-trip test (line 19-21) partially compensates, but the generate test in isolation provides false confidence.

**How**: Decode the payload portion and assert it contains the expected `userId` and a reasonable `exp` value. Assert the signature is 64 hex characters (SHA-256 output).

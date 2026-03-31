# InvitationService — Test Analysis

## What We're Building

An invitation system where users can invite others by email. Each invitation has a token, a 24-hour expiration, and can be accepted or expire.

## Test Infrastructure (Step 1)

The project uses:
- **Framework**: Vitest with `globals: true`, node environment
- **Test location**: `src/__tests__/` with `*.test.ts` naming
- **Mocking**: `vi.mock('../db')` to mock the db module, `vi.mocked()` for type-safe mock setup
- **Pattern**: Service classes in `src/services/`, db abstraction in `src/db.ts`
- **Conventions**: `beforeEach(() => vi.clearAllMocks())`, `describe` blocks per method, behavior-driven test names

We follow all of these exactly.

## What to Test (Step 2)

### Happy Paths

1. **Creating an invitation** — Given a valid email, creates an invitation with a token, status "pending", and expiration 24 hours from now. Verifies the invitation is persisted via `db.invitations.create`.

2. **Token generation** — Each invitation gets a unique, non-empty token string.

3. **Expiration is set to 24 hours** — The `expiresAt` timestamp is approximately 24 hours in the future from creation time.

4. **Accepting an invitation** — Given a valid token for a pending, non-expired invitation, marks it as "accepted". Returns the accepted invitation.

5. **Looking up invitation by token** — The service retrieves an invitation by its token from the database.

### Failure Modes

6. **Accepting with invalid token** — Token doesn't match any invitation. Should throw.

7. **Accepting an expired invitation** — The invitation exists but `expiresAt` is in the past. Should throw, even if status is still "pending".

8. **Accepting an already-accepted invitation** — The invitation exists and is not expired, but status is already "accepted". Should throw — double-accept is not allowed.

9. **Inviting an already-invited email with a pending invitation** — An active (pending, non-expired) invitation already exists for this email. Should throw to prevent spam/duplicate invitations.

10. **Inviting with an invalid email** — Empty string or clearly malformed input. Should throw.

### What We're NOT Testing

- Token randomness distribution (that's `crypto.randomUUID` behavior, not ours)
- Database internals (we mock the db layer)
- Trivial getters with no logic

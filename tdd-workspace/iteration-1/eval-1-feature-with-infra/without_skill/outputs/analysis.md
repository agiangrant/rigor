# Analysis: Invitation System

## Existing Project Conventions

- **DB layer**: `src/db.ts` exports a `db` object with namespace-grouped async methods (e.g., `db.users.findById`). Already includes an `invitations` namespace with `create`, `findByEmail`, `findByToken`, and `update` stubs.
- **Services**: Live in `src/services/`, are classes with async methods, import `db` directly, and throw `Error` with descriptive messages for failure cases.
- **Tests**: Live in `src/__tests__/`, use Vitest with `vi.mock('../db')` to mock the entire db module. Each test file follows the pattern: import service + db, mock db, `describe` blocks per method, `beforeEach(() => vi.clearAllMocks())`, mock return values per test.
- **Config**: Vitest with `globals: true`, node environment.

## Design Decisions

1. **Token generation**: `crypto.randomBytes(32).toString('hex')` — 64-character hex string, cryptographically secure.
2. **Expiration**: 24 hours from creation, stored as a `Date` on the invitation record.
3. **Status model**: `'pending' | 'accepted' | 'expired'` — simple three-state lifecycle.
4. **Duplicate guard**: Only one active (pending + not expired) invitation per email at a time. Previous expired or accepted invitations don't block new ones.
5. **Lazy expiration**: When accepting, if the invitation is past its `expiresAt` but still marked `pending`, the service updates it to `expired` before throwing — no background job needed.
6. **Validation**: Basic email validation (non-empty, contains `@`). The service layer doesn't send emails — that's a separate concern.

## Files Created

- `outputs/src/services/invitationService.ts` — `InvitationService` class with `invite(email)` and `accept(token)` methods
- `outputs/src/__tests__/invitationService.test.ts` — 9 test cases covering happy paths, validation, duplicate prevention, acceptance, and expiration edge cases

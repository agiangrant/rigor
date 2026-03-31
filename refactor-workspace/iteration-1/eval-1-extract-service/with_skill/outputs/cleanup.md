# Cleanup: Files to Delete

The following files are replaced by the refactored versions and should be deleted:

## Deleted Files

- `src/userManager.ts` — replaced by `src/userService.ts` and `src/authService.ts`
- `src/__tests__/userManager.test.ts` — replaced by `src/__tests__/userService.test.ts` and `src/__tests__/authService.test.ts`

## Modified Files

- `src/apiRoutes.ts` — updated imports from `UserManager` to `UserService` + `AuthService`, routes dispatch to the appropriate service

## Unchanged Files

- `src/db.ts`
- `src/crypto.ts`
- `src/email.ts`

## Verification Checklist

- [ ] Zero references to `UserManager` remain in the codebase
- [ ] Zero imports from `./userManager` remain
- [ ] All tests pass against the new service structure
- [ ] No dead code or compatibility shims

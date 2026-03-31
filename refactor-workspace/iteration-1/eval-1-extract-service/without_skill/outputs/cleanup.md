# Cleanup: Files to Delete

After verifying the refactored code works correctly, delete these files from the original project:

| File | Reason |
|---|---|
| `src/userManager.ts` | Replaced by `src/userService.ts` (user CRUD) and `src/authService.ts` (auth + password management) |
| `src/__tests__/userManager.test.ts` | Replaced by `src/__tests__/userService.test.ts` and `src/__tests__/authService.test.ts` |

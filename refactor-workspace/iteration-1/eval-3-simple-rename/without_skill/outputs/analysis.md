# Analysis: Rename utils/formatDate.ts to utils/dateFormatting.ts

## Task

Rename `utils/formatDate.ts` to `utils/dateFormatting.ts` to align with the team's noun-based naming convention for util modules.

## Scope Assessment

The rename is a single-file move with import path updates. No exported symbols change — only the module path.

### Source file

- `src/utils/formatDate.ts` — renamed to `src/utils/dateFormatting.ts`

### Files with import dependencies on `utils/formatDate`

1. `src/services/auditService.ts` — imports `formatDateTime`
2. `src/services/reportService.ts` — imports `formatDate`, `formatDateTime`
3. `src/__tests__/formatDate.test.ts` — imports `formatDate`, `formatDateTime`, `parseDate`

## Changes Made

| File | Change |
|------|--------|
| `src/utils/dateFormatting.ts` | New file (contents identical to old `formatDate.ts`) |
| `src/services/auditService.ts` | Import path `../utils/formatDate` changed to `../utils/dateFormatting` |
| `src/services/reportService.ts` | Import path `../utils/formatDate` changed to `../utils/dateFormatting` |
| `src/__tests__/formatDate.test.ts` | Import path `../utils/formatDate` changed to `../utils/dateFormatting` |
| `src/utils/formatDate.ts` | Deleted (see cleanup.md) |

## Risk Assessment

**Low risk.** This is a pure rename with no logic changes. All three consuming files have been updated. The exported function names (`formatDate`, `formatDateTime`, `parseDate`) remain unchanged, so no call sites beyond the import statements need modification.

## Notes

- The test file name (`formatDate.test.ts`) was kept as-is since the task only specified renaming the util module. The team may want to rename the test file to `dateFormatting.test.ts` separately for consistency, but that was not part of this request.

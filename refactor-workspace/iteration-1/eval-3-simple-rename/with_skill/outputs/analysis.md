# Refactor Analysis: Rename formatDate.ts to dateFormatting.ts

## Step 1: Understand What Exists

### Current Structure

```
src/
  utils/
    formatDate.ts          — exports: formatDate, formatDateTime, parseDate
  services/
    auditService.ts        — imports: formatDateTime from ../utils/formatDate
    reportService.ts       — imports: formatDate, formatDateTime from ../utils/formatDate
  __tests__/
    formatDate.test.ts     — imports: formatDate, formatDateTime, parseDate from ../utils/formatDate
```

### Dependency Map

`utils/formatDate.ts` is imported by three files:
1. `services/auditService.ts` — uses `formatDateTime`
2. `services/reportService.ts` — uses `formatDate`, `formatDateTime`
3. `__tests__/formatDate.test.ts` — uses `formatDate`, `formatDateTime`, `parseDate`

### Blast Radius

- **4 files total** — 1 renamed, 3 updated imports
- The test file should also be renamed to match the new module name: `formatDate.test.ts` -> `dateFormatting.test.ts`
- No barrel files, no re-exports, no configuration references found.

### Why It Is the Way It Is

The current name `formatDate` uses verb-based naming (describing what the module does). The team has decided to standardize on noun-based naming for util modules, hence `dateFormatting`.

## Step 2: Target State

```
src/
  utils/
    dateFormatting.ts      — same exports, no changes to function signatures
  services/
    auditService.ts        — import path updated to ../utils/dateFormatting
    reportService.ts       — import path updated to ../utils/dateFormatting
  __tests__/
    dateFormatting.test.ts — import path updated to ../utils/dateFormatting
```

All function names (`formatDate`, `formatDateTime`, `parseDate`) remain unchanged — the rename is at the module level only, consistent with the "noun-based naming for util modules" convention. Function names are verbs by nature and are not affected by this convention.

This target state supports future util modules following the same pattern (e.g., `stringFormatting.ts`, `numberParsing.ts`, `dateValidation.ts`).

## Step 3: Options

This is a straightforward rename with a clear team decision. There is only one reasonable approach:

**Option A (recommended): Rename file + update all imports + rename test file**
- Rename `utils/formatDate.ts` to `utils/dateFormatting.ts`
- Rename `__tests__/formatDate.test.ts` to `__tests__/dateFormatting.test.ts`
- Update all 3 import paths
- No function signature changes needed
- Blast radius: 4 files, all contained

There is no viable alternative — the team decided on the naming convention, and a compatibility shim or re-export would violate the "no half-migrations" principle.

## Step 4: Execution

All affected files are included in the outputs directory with updated paths and imports.

## Step 5: Tests

The test file is renamed to `dateFormatting.test.ts` and its import path is updated. All test cases remain identical — the refactor changes no behavior, only the module name. The test file covers all three exported functions.

## Step 6: Completeness Verification

- Zero references to old path `utils/formatDate` remain in any output file
- No dead code — old `formatDate.ts` and `formatDate.test.ts` listed for deletion in cleanup.md
- Test structure matches new file structure
- Target state from Step 2 is fully achieved

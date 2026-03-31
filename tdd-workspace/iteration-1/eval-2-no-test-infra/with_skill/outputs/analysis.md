# Invoice Service Test Analysis

## Step 1: Establish Test Infrastructure

**No test infrastructure exists.** The project has zero test-related dependencies, no test scripts in `package.json`, and no test configuration files. Per TDD methodology, this decision must be surfaced before writing any tests.

### Decision Required: Test Framework

#### Option A: Vitest

**Trade-offs:**
- (+) Native ESM support — this project uses `"type": "module"` and ESNext modules, so Vitest works out of the box with no transform config
- (+) First-class TypeScript support via esbuild/SWC — no separate `ts-jest` config needed
- (+) Fast execution with smart watch mode
- (+) Jest-compatible API (`describe`, `it`, `expect`) — familiar to most TypeScript developers
- (+) Built-in mocking via `vi.mock()` / `vi.fn()`
- (-) Smaller ecosystem than Jest (fewer blog posts, Stack Overflow answers)

#### Option B: Jest with ts-jest

**Trade-offs:**
- (+) Largest ecosystem, most widely used in TypeScript projects
- (-) ESM support is still experimental and requires configuration (`--experimental-vm-modules`, transform config, `extensionsToTreatAsEsm`)
- (-) Requires `ts-jest` or `@swc/jest` as an additional transform dependency
- (-) The ESM + TypeScript + Jest combination is notoriously finicky to configure correctly
- (-) Heavier dependency footprint

#### Option C: Node.js built-in test runner (`node:test`)

**Trade-offs:**
- (+) Zero dependencies
- (+) Native ESM support
- (-) Requires Node 18+ (likely fine given ES2022 target)
- (-) Immature mocking capabilities compared to Vitest/Jest
- (-) Less ergonomic assertion API
- (-) No built-in TypeScript support — requires a separate compile step or a loader like `tsx`

### Recommendation: Vitest

Vitest is the strongest fit for this project because:
1. The project already uses ESM (`"type": "module"`, `"module": "ESNext"`). Vitest handles this natively. Jest does not — it would require experimental flags and transform configuration.
2. TypeScript works without additional transform packages.
3. The mocking API is sufficient for what we need (mocking `pg.Pool`).
4. Minimal configuration needed — likely just installing `vitest` and adding a test script.

### Decision Required: Test File Location

**Option A: Co-located** — `src/invoiceService.test.ts` next to the source file.
- Keeps tests close to what they test. Common in Vitest/Jest TypeScript projects.

**Option B: Separate directory** — `src/__tests__/invoiceService.test.ts`.
- Separates test files from source. Common in larger projects.

**Recommendation:** Co-located (`src/invoiceService.test.ts`). The project has a single source file, and co-location is the simplest convention. The `tsconfig.json` already includes `src/`, and Vitest will discover `.test.ts` files automatically.

### Required Dependencies

Whichever framework is chosen, these would be needed:

| Framework | Packages to install |
|-----------|-------------------|
| Vitest | `vitest` |
| Jest | `jest`, `ts-jest`, `@types/jest` (plus ESM config) |
| node:test | `tsx` (for TypeScript loader) |

---

## STOPPED: Awaiting Decision

Per TDD discipline, I will not write any tests until the test infrastructure decision is confirmed. Please confirm:

1. **Test framework**: Vitest (recommended), Jest, or node:test?
2. **Test file location**: Co-located (recommended) or `__tests__/` directory?

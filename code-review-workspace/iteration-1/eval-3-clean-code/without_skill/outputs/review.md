# Code Review: Slug Generation Utility

## Files Reviewed

- `src/services/slugService.ts`
- `src/__tests__/slugService.test.ts`

---

## Summary

This is a small, well-written slug utility with two functions: `generateSlug` (transforms a title string into a URL-friendly slug) and `isValidSlug` (validates a slug against a strict pattern). The code is clean, the regex chain is correct, and the tests are solid. A few issues are worth addressing.

---

## Issues

### 1. `generateSlug` can produce slugs that fail `isValidSlug`

`generateSlug("")` returns `""`, and `isValidSlug("")` returns `false`. Same for input like `"!@#$%"`. The two functions disagree on whether an empty string is a valid slug. This is a contract inconsistency -- callers who generate a slug and then validate it will get a surprising failure.

**Options:**
- Have `generateSlug` throw on input that would produce an empty slug.
- Have `generateSlug` return `null` or a result type to signal failure.
- Document the invariant explicitly so callers know to check for empty output.

The right choice depends on how this is used (e.g., does the caller already handle empty slugs before persisting?), but the current implicit mismatch is a bug waiting to happen.

### 2. Unicode and non-ASCII input is silently stripped

The regex `[^\w\s-]` relies on `\w`, which in JavaScript matches only `[a-zA-Z0-9_]`. Any non-ASCII characters -- accented letters, CJK, Cyrillic, etc. -- are stripped entirely:

- `"Cafe Creme"` works fine, but `"Cafe Creme"` with accented `e` becomes `"caf-crme"` (missing the `e` entirely if the accent is a combining character) or `"caf-crem"` depending on encoding.
- `"Uber uns"` (German for "About us") with an umlaut becomes `"ber-uns"`.

If this utility will ever see internationalized content, it needs a transliteration step (e.g., a library like `slugify` or `transliterate`) before the regex strip. If it is intentionally ASCII-only, that constraint should be documented or enforced at the type/validation level.

### 3. No max-length enforcement

URL slugs that exceed a few hundred characters cause problems in URLs, database columns, and SEO. The utility has no truncation. If the input is a long blog title or user-generated content, the slug can be arbitrarily long. Consider truncating to a reasonable limit (e.g., 80-100 characters), breaking at a word boundary rather than mid-word.

---

## Test Coverage Assessment

The tests are well-structured and cover the important cases: basic conversion, special characters, whitespace/dash collapsing, leading/trailing dashes, empty input, special-character-only input, underscores, and both valid/invalid slug patterns.

### Missing test cases

- **Unicode input** -- no test for accented characters, emoji, or non-Latin scripts. Even if the current behavior (stripping them) is intentional, a test should pin that behavior so a future change doesn't silently alter it.
- **Very long input** -- no test for slug length behavior on large strings.
- **Numeric-only slugs** -- `generateSlug("123")` should return `"123"` and `isValidSlug("123")` should return `true`. Worth a test to confirm.
- **The `generateSlug`/`isValidSlug` contract** -- there is no test asserting that `isValidSlug(generateSlug(input))` holds for non-degenerate inputs. A property-based or parameterized test for this invariant would catch the empty-string gap and any future regressions.

---

## Code Quality Notes

- The regex chain in `generateSlug` is clean and reads well as a pipeline. Each step has a clear purpose. No complaints on style.
- `isValidSlug` uses a precise regex that correctly rejects leading dashes, trailing dashes, consecutive dashes, uppercase, and spaces. It is stricter than `generateSlug`'s output format, which is fine as long as the contract gap (issue #1) is addressed.
- The module has no dependencies, which is appropriate for a utility this simple.
- Exporting both functions as named exports is the right call for tree-shaking and clarity.

---

## Verdict

Solid utility for ASCII-only, short-title use cases. The `generateSlug`/`isValidSlug` contract mismatch on empty output is the most important issue to fix. Unicode handling and length limits are worth deciding on explicitly rather than leaving as implicit behavior.

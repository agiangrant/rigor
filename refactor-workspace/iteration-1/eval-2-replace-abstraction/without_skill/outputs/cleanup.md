# Cleanup: Files and Exports to Remove

## Deleted exports (from old `cache.ts`)

The following free-function exports no longer exist. All call sites have been migrated.

- `cacheGet` -- replaced by `Cache<T>.get()`
- `cacheSet` -- replaced by `Cache<T>.set()`
- `cacheDelete` -- replaced by `Cache<T>.delete()`
- `cacheClear` -- replaced by `Cache<T>.clear()`
- `cacheGetAll` -- removed entirely; was only used by ConfigService which no longer depends on cache

## Files replaced in-place

| File | What changed |
|------|-------------|
| `src/cache.ts` | Complete rewrite: module-level functions replaced with `Cache<T>` class |
| `src/configService.ts` | Removed cache import; uses internal `Map<string, unknown>` |
| `src/productService.ts` | Uses `Cache<Product>` and `Cache<Product[]>` instances instead of global functions |
| `src/userService.ts` | Uses `Cache<User>` instance; **fixed bug**: now invalidates cache on `updateUser` |
| `src/__tests__/cache.test.ts` | Rewritten to test `Cache<T>` class including TTL, LRU eviction, maxSize |
| `src/__tests__/productService.test.ts` | Updated mocking strategy for `Cache` class |

## No files are deleted

All files remain in the same locations. The refactoring is a replacement of the cache module's API, not a file restructure.

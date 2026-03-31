# Analysis: Cache Layer Refactoring

## Problems Identified

### 1. No TTL configurability
The current cache hardcodes a 5-minute TTL (`300000ms`) inside `cacheGet`. Callers cannot configure TTL per use case -- product data and config data have very different staleness tolerances but share the same expiry.

### 2. Unbounded memory growth
There is no eviction strategy. The global `Map` grows without limit. Every `cacheSet` adds entries; only explicit `cacheDelete` or the hardcoded TTL expiry (which only fires on read) removes them. Entries that are never read again stay forever.

### 3. ConfigService misuses cache as a general-purpose store
`ConfigService` uses `cacheSet`/`cacheGet` to store application configuration (feature flags, limits). This is state management, not caching. Config data should not be subject to TTL expiry -- a 5-minute TTL on feature flags means they silently disappear. It also couples ConfigService to the cache module's lifecycle and clearing behavior.

### 4. No type safety
Everything flows through `any`. Callers get no type checking on cached values.

### 5. UserService never invalidates on update
`UserService.updateUser` writes to the DB but never invalidates the user cache entry. This is a known bug (commented in code) made worse by the lack of a clear cache contract.

### 6. Shared global state
All consumers share a single `Map`. `cacheClear()` wipes everything -- if ConfigService clears config, it also wipes product and user caches.

## Refactoring Plan

### Replace the hand-rolled cache with a `Cache<T>` class

- Each consumer gets its own `Cache` instance with configurable TTL and max size
- Type-safe: `Cache<Product>` only stores/returns `Product`
- TTL is per-instance (set at construction), solving the configurability problem
- `maxSize` with LRU eviction prevents unbounded growth
- Instances are isolated -- clearing one cache doesn't affect others

### Extract ConfigService to use its own in-memory store

ConfigService is not caching; it is storing application state. Give it a simple `Map<string, unknown>` internally. It should not depend on the cache module at all.

### Fix UserService cache invalidation

With a dedicated `Cache<User>` instance, `updateUser` can call `cache.delete(id)` to invalidate properly.

### What changes per file

| File | Change |
|------|--------|
| `cache.ts` | Replace with `Cache<T>` class -- configurable TTL, maxSize, LRU eviction |
| `productService.ts` | Create a `Cache<Product>` instance, use it directly |
| `userService.ts` | Create a `Cache<User>` instance, invalidate on update |
| `configService.ts` | Remove cache dependency entirely, use internal Map |
| `db.ts` | No changes |
| `cache.test.ts` | Rewrite to test the new `Cache<T>` class |
| `productService.test.ts` | Update to work with the new cache instance (inject or mock) |

### What gets deleted

- The old `cacheGet`, `cacheSet`, `cacheClear`, `cacheDelete`, `cacheGetAll` exports are removed entirely. They are replaced by `Cache<T>` instance methods.

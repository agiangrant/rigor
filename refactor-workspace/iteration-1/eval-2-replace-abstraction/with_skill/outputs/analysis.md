# Refactor Analysis: Replace Hand-Rolled Cache

## What Exists

### Current Structure

| File | Role | Cache dependency |
|------|------|-----------------|
| `cache.ts` | Global in-memory cache with hardcoded 5-min TTL | The module itself |
| `configService.ts` | Stores/retrieves app configuration | Imports `cacheGet`, `cacheSet`, `cacheGetAll` — misuses cache as a key-value config store |
| `productService.ts` | CRUD for products with cache-aside reads | Imports `cacheGet`, `cacheSet`, `cacheDelete` — legitimate caching |
| `userService.ts` | User lookups with cache-aside reads | Imports `cacheGet`, `cacheSet` — legitimate caching, but never invalidates on update (known bug) |
| `db.ts` | Stub database layer | No cache dependency |
| `__tests__/cache.test.ts` | Tests cache primitives directly | Tests the old module |
| `__tests__/productService.test.ts` | Tests ProductService with mocked cache | Mocks old cache module by path |

### Problems

1. **Hardcoded TTL** — 5-minute staleness check baked into `cacheGet`, no way to configure per use case
2. **Unbounded memory** — no max-size, no eviction policy, store grows forever
3. **ConfigService abuse** — uses cache as a general-purpose key-value store, not caching anything (config doesn't have an underlying data source it's caching against)
4. **Global mutable state** — module-level `Map` shared by all consumers, impossible to isolate in tests without `cacheClear()`
5. **UserService invalidation bug** — `updateUser` never invalidates the cache (comment says "known bug")
6. **No typing** — everything is `any`

### Blast Radius

- 4 source files change (cache.ts, configService.ts, productService.ts, userService.ts)
- 2 test files change (cache.test.ts, productService.test.ts)
- db.ts is unaffected

---

## Options

### Option A: Cache class with configurable TTL + separate ConfigStore

**What changes:**
- Replace `cache.ts` with a `Cache` class that accepts options (`ttlMs`, `maxSize`) and uses instance state (no global)
- Extract ConfigService's storage into a dedicated `ConfigStore` class (simple Map wrapper, no TTL, no cache semantics)
- ProductService and UserService receive a `Cache` instance (via constructor injection), enabling per-service TTL and testability
- Fix UserService invalidation bug during migration

**Resulting structure:**
```
src/
  cache.ts          -> Cache class with options { ttlMs, maxSize }
  configStore.ts    -> NEW — simple typed key-value store for config (replaces ConfigService's cache abuse)
  configService.ts  -> Uses ConfigStore instead of Cache
  productService.ts -> Constructor-injected Cache instance
  userService.ts    -> Constructor-injected Cache instance, invalidation bug fixed
  db.ts             -> Unchanged
  __tests__/
    cache.test.ts          -> Tests Cache class directly
    configStore.test.ts    -> NEW — tests ConfigStore
    productService.test.ts -> Updated to inject Cache mock
    userService.test.ts    -> NEW — tests including invalidation
```

**Trade-offs:**
- (+) Clean separation: caching is caching, config storage is config storage
- (+) Configurable TTL and max size solve the stated problems directly
- (+) Constructor injection makes testing easy — no module mocking needed
- (+) Minimal conceptual overhead — same patterns, better execution
- (-) Slightly more files (configStore.ts is new)
- (-) Consumers must pass a Cache instance (minor wiring)

### Option B: Generic key-value Store interface with TTL and Bounded variants

**What changes:**
- Define a `Store<T>` interface with `get`, `set`, `delete`, `clear`
- Implement `BoundedCache<T>` (TTL + max size + LRU eviction) and `SimpleStore<T>` (no TTL, no eviction)
- ConfigService uses `SimpleStore`, ProductService/UserService use `BoundedCache`
- All consumers receive their store via constructor injection

**Resulting structure:**
```
src/
  store.ts          -> Store<T> interface + BoundedCache<T> + SimpleStore<T>
  configService.ts  -> Uses SimpleStore<T>
  productService.ts -> Uses BoundedCache<Product>
  userService.ts    -> Uses BoundedCache<User>
  db.ts             -> Unchanged
  __tests__/
    store.test.ts          -> Tests both implementations
    productService.test.ts -> Updated
    userService.test.ts    -> NEW
```

**Trade-offs:**
- (+) Single interface for all storage needs — config and cache share a contract
- (+) More extensible if future storage backends emerge (Redis, etc.)
- (-) Over-abstracted for current needs — ConfigService doesn't need a Store interface, it needs a simple Map
- (-) Shared interface implies interchangeability that doesn't actually exist (a config store and a TTL cache have fundamentally different semantics)
- (-) LRU eviction adds complexity that may not be needed yet

---

## Recommendation

**Option A.** The core insight is that ConfigService is not caching — it's storing state. Giving it the same interface as a cache (even a generic `Store` interface) perpetuates the conceptual confusion that caused the problem in the first place. A cache and a config store are different things; they should be different types.

Option A solves all stated problems (TTL configurability, bounded memory, ConfigService misuse) with minimal new abstraction. It keeps the door open for a `Store` interface later if needed, without building it before there's a second use case.

---

## Decision Needed

Which option should I proceed with? Or is there a different direction you'd prefer?

# Analysis: Caching Layer for Config Service

## Codebase Scan Summary

| Aspect | Convention |
|---|---|
| Error handling | `thiserror` custom enum (`ConfigError`) |
| Async runtime | `tokio` (full features), `async-trait` |
| Trait design | `ConfigStore` trait, static dispatch via generics |
| Module structure | File-per-module, `lib.rs` re-exports |
| Serialization | `serde` derives (`Serialize, Deserialize`) |
| Standard derives | `Debug, Clone, Serialize, Deserialize` on data; `Debug, Error` on errors |
| Ownership | `&str` params, owned returns, service owns store |
| Testing | None established yet |

## Design: Cache as ConfigStore Decorator

The caching wrapper implements `ConfigStore` and wraps an inner `ConfigStore`. This composes naturally with the existing generic `ConfigService<S: ConfigStore>` -- you can stack `ConfigService<CachedStore<InMemoryStore>>` without changing any existing code.

## Pattern Decisions Requiring Input

### 1. Interior Mutability for Cache State

The `ConfigStore` trait methods take `&self`, but the cache must be mutated on reads (cache population) and writes (cache update/invalidation). This requires interior mutability.

**Option A: `tokio::sync::RwLock<HashMap<...>>`**
- Read-heavy workload gets concurrent reads; writes take exclusive lock
- Familiar async-aware lock, matches the tokio runtime already in use
- Cache operations are fast (no I/O under the lock), so contention is minimal
- Signature: `cache: RwLock<HashMap<String, CacheEntry>>`

**Option B: `tokio::sync::Mutex<HashMap<...>>`**
- Simpler API -- one lock type, no read/write distinction
- Sufficient if contention is low
- Signature: `cache: Mutex<HashMap<String, CacheEntry>>`

**Option C: `std::sync::RwLock<HashMap<...>>`**
- No async awareness -- must not hold across `.await` points
- Cache operations are pure in-memory, so this actually works: lock, read/write HashMap, unlock, then await the store
- Lower overhead than async locks
- Signature: `cache: std::sync::RwLock<HashMap<String, CacheEntry>>`

**Recommendation: Option A (`tokio::sync::RwLock`)**
The project is already async-first with tokio. Using tokio's RwLock is idiomatic for this codebase, avoids subtle footguns with holding std locks near async code, and optimizes for the read-heavy access pattern caches typically see.

### 2. TTL Time Source

Cache entries need expiration. The question is how to get "now."

**Option A: `std::time::Instant` directly**
- Simple, no abstraction overhead
- TTL tests must use real time or very short durations
- Signature: `stored_at: Instant` in cache entry, compare with `Instant::now()`

**Option B: Injectable clock trait**
- Testable -- tests can advance time without sleeping
- Adds a type parameter or trait object to the cache
- More machinery for a straightforward need

**Option C: `Instant` with a `fn() -> Instant` factory**
- Testable -- inject a custom clock function for tests
- Minimal API surface -- just a function pointer, no trait
- Signature: `clock: fn() -> Instant` field on cache struct, defaults to `Instant::now`

**Recommendation: Option C (function-based clock)**
It gives testability without the weight of a trait. The cache struct takes an optional clock function, defaults to `Instant::now`. Tests inject a controllable clock. This keeps the public API clean -- users never see it -- while making TTL behavior fully testable.

### 3. Cache Scope for `list_all`

The `ConfigStore` trait has a `list_all` method. Caching individual keys is straightforward, but `list_all` is a different shape.

**Option A: Don't cache `list_all` -- pass through to store**
- Simple, avoids consistency headaches
- `list_all` is typically not on the hot path
- Individual key caches still help the common case

**Option B: Cache `list_all` result as a separate cache entry**
- Adds complexity: must invalidate on every write/delete
- Easy to get stale

**Recommendation: Option A (pass through)**
Caching `list_all` adds invalidation complexity with minimal benefit. Individual key caching covers the hot path. `list_all` goes straight to the store.

## Proposed Structure

New file: `src/cached_store.rs`

```
CacheEntry { entry: ConfigEntry, stored_at: Instant }
CachedStore<S: ConfigStore> {
    inner: S,
    cache: RwLock<HashMap<String, CacheEntry>>,
    ttl: Duration,
    clock: fn() -> Instant,
}
```

- `get`: check cache, return if fresh, else fetch from inner, populate cache
- `set`: write to inner, update cache with result
- `delete`: delete from inner, remove from cache
- `list_all`: pass through to inner (no caching)

## Awaiting Confirmation

Please confirm or adjust these three decisions before I proceed with implementation:

1. **Interior mutability**: `tokio::sync::RwLock` (Option A)
2. **Time source**: `fn() -> Instant` factory (Option C)
3. **`list_all` caching**: Pass through, no caching (Option A)

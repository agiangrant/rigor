# Analysis: Caching Layer for Config Service

## Existing Design

The project defines a `ConfigStore` trait with four async methods (`get`, `set`, `list_all`, `delete`) and a `ConfigService<S: ConfigStore>` that wraps any store implementation. `ConfigEntry` carries a key, value, and version number. The service layer adds validation (empty key check) and existence checks (delete verifies key exists before forwarding).

## Approach: Wrapper Type Implementing `ConfigStore`

The caching layer should be a `CachedConfigStore<S: ConfigStore>` that itself implements `ConfigStore`. This lets it be plugged into the existing `ConfigService<S>` without any changes to that type -- composition via the trait boundary.

### Key ownership decisions

1. **Cache storage**: `std::collections::HashMap<String, CachedValue>` behind a `tokio::sync::RwLock`. The `RwLock` is needed because `ConfigStore` takes `&self`, not `&mut self`, so interior mutability is required. `tokio::sync::RwLock` (not `std::sync::RwLock`) because we need to hold the lock across `.await` points for write-through consistency.

2. **TTL representation**: `std::time::Duration` for the configurable TTL, `std::time::Instant` stored per cache entry to track insertion time. `Instant` is monotonic so immune to clock adjustments.

3. **`CachedValue` struct**: Owns a `ConfigEntry` (clone on cache hit) plus an `Instant`. Cloning `ConfigEntry` is cheap (three small fields).

4. **Write-through**: `set` updates the backing store first, then inserts into cache on success. This avoids caching data that failed to persist. `delete` removes from both store and cache. `list_all` is not cached -- it's a bulk operation and caching it correctly (invalidation on any write) adds complexity without clear value.

5. **No `Arc` needed on the wrapper itself**: The caller (`ConfigService`) owns the store by value. The `RwLock` provides shared-interior-mutability for the cache map. If the user needs shared ownership of the whole service, they wrap it in `Arc` at the call site -- that's not our concern.

## Files to produce

- `src/cached.rs` -- `CachedConfigStore` implementation + tests
- `src/lib.rs` -- updated to include `mod cached`
- `Cargo.toml` -- no changes needed (tokio, async-trait already present)

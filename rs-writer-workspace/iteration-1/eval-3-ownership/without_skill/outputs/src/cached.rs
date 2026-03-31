use std::collections::HashMap;
use std::time::{Duration, Instant};

use async_trait::async_trait;
use tokio::sync::RwLock;

use crate::config::{ConfigEntry, ConfigError, ConfigStore};

struct CachedValue {
    entry: ConfigEntry,
    inserted_at: Instant,
}

pub struct CachedConfigStore<S: ConfigStore> {
    inner: S,
    cache: RwLock<HashMap<String, CachedValue>>,
    ttl: Duration,
}

impl<S: ConfigStore> CachedConfigStore<S> {
    pub fn new(inner: S, ttl: Duration) -> Self {
        Self {
            inner,
            cache: RwLock::new(HashMap::new()),
            ttl,
        }
    }

    fn is_fresh(cached: &CachedValue, ttl: Duration) -> bool {
        cached.inserted_at.elapsed() < ttl
    }
}

#[async_trait]
impl<S: ConfigStore> ConfigStore for CachedConfigStore<S> {
    async fn get(&self, key: &str) -> Result<Option<ConfigEntry>, ConfigError> {
        // Check cache first (read lock).
        {
            let cache = self.cache.read().await;
            if let Some(cached) = cache.get(key) {
                if Self::is_fresh(cached, self.ttl) {
                    return Ok(Some(cached.entry.clone()));
                }
            }
        }

        // Cache miss or stale -- fetch from backing store.
        let result = self.inner.get(key).await?;

        // Populate cache on hit, evict on miss.
        let mut cache = self.cache.write().await;
        match &result {
            Some(entry) => {
                cache.insert(
                    key.to_string(),
                    CachedValue {
                        entry: entry.clone(),
                        inserted_at: Instant::now(),
                    },
                );
            }
            None => {
                cache.remove(key);
            }
        }

        Ok(result)
    }

    async fn set(&self, key: &str, value: &str) -> Result<ConfigEntry, ConfigError> {
        // Write through: persist first, then cache.
        let entry = self.inner.set(key, value).await?;

        let mut cache = self.cache.write().await;
        cache.insert(
            key.to_string(),
            CachedValue {
                entry: entry.clone(),
                inserted_at: Instant::now(),
            },
        );

        Ok(entry)
    }

    async fn list_all(&self) -> Result<Vec<ConfigEntry>, ConfigError> {
        // Not cached -- pass through to backing store.
        self.inner.list_all().await
    }

    async fn delete(&self, key: &str) -> Result<(), ConfigError> {
        self.inner.delete(key).await?;

        let mut cache = self.cache.write().await;
        cache.remove(key);

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::Arc;
    use tokio::sync::Mutex;

    /// A fake in-memory store that tracks call counts so tests can verify
    /// cache hits vs misses.
    struct FakeStore {
        data: Mutex<HashMap<String, ConfigEntry>>,
        get_count: AtomicU64,
        set_count: AtomicU64,
        next_version: AtomicU64,
    }

    impl FakeStore {
        fn new() -> Self {
            Self {
                data: Mutex::new(HashMap::new()),
                get_count: AtomicU64::new(0),
                set_count: AtomicU64::new(0),
                next_version: AtomicU64::new(1),
            }
        }

        fn get_count(&self) -> u64 {
            self.get_count.load(Ordering::SeqCst)
        }

        fn set_count(&self) -> u64 {
            self.set_count.load(Ordering::SeqCst)
        }
    }

    #[async_trait]
    impl ConfigStore for FakeStore {
        async fn get(&self, key: &str) -> Result<Option<ConfigEntry>, ConfigError> {
            self.get_count.fetch_add(1, Ordering::SeqCst);
            let data = self.data.lock().await;
            Ok(data.get(key).cloned())
        }

        async fn set(&self, key: &str, value: &str) -> Result<ConfigEntry, ConfigError> {
            self.set_count.fetch_add(1, Ordering::SeqCst);
            let version = self.next_version.fetch_add(1, Ordering::SeqCst);
            let entry = ConfigEntry {
                key: key.to_string(),
                value: value.to_string(),
                version,
            };
            let mut data = self.data.lock().await;
            data.insert(key.to_string(), entry.clone());
            Ok(entry)
        }

        async fn list_all(&self) -> Result<Vec<ConfigEntry>, ConfigError> {
            let data = self.data.lock().await;
            Ok(data.values().cloned().collect())
        }

        async fn delete(&self, key: &str) -> Result<(), ConfigError> {
            let mut data = self.data.lock().await;
            data.remove(key);
            Ok(())
        }
    }

    // We need FakeStore behind Arc so we can inspect counters after handing
    // ownership to CachedConfigStore. We'll use a small wrapper.
    struct SharedFakeStore(Arc<FakeStore>);

    #[async_trait]
    impl ConfigStore for SharedFakeStore {
        async fn get(&self, key: &str) -> Result<Option<ConfigEntry>, ConfigError> {
            self.0.get(key).await
        }
        async fn set(&self, key: &str, value: &str) -> Result<ConfigEntry, ConfigError> {
            self.0.set(key, value).await
        }
        async fn list_all(&self) -> Result<Vec<ConfigEntry>, ConfigError> {
            self.0.list_all().await
        }
        async fn delete(&self, key: &str) -> Result<(), ConfigError> {
            self.0.delete(key).await
        }
    }

    fn make_cached(
        ttl: Duration,
    ) -> (Arc<FakeStore>, CachedConfigStore<SharedFakeStore>) {
        let fake = Arc::new(FakeStore::new());
        let cached = CachedConfigStore::new(SharedFakeStore(Arc::clone(&fake)), ttl);
        (fake, cached)
    }

    #[tokio::test]
    async fn get_miss_then_hit() {
        let (fake, cached) = make_cached(Duration::from_secs(60));

        // Seed a value in the backing store.
        fake.set("k1", "v1").await.unwrap();

        // First get: cache miss, hits backing store.
        let entry = cached.get("k1").await.unwrap().unwrap();
        assert_eq!(entry.value, "v1");
        assert_eq!(fake.get_count(), 1);

        // Second get: cache hit, does NOT hit backing store.
        let entry = cached.get("k1").await.unwrap().unwrap();
        assert_eq!(entry.value, "v1");
        assert_eq!(fake.get_count(), 1); // unchanged
    }

    #[tokio::test]
    async fn get_returns_none_for_missing_key() {
        let (_fake, cached) = make_cached(Duration::from_secs(60));

        let result = cached.get("nope").await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn set_populates_cache() {
        let (fake, cached) = make_cached(Duration::from_secs(60));

        cached.set("k1", "v1").await.unwrap();
        assert_eq!(fake.set_count(), 1);

        // Subsequent get should be a cache hit.
        let entry = cached.get("k1").await.unwrap().unwrap();
        assert_eq!(entry.value, "v1");
        assert_eq!(fake.get_count(), 0); // never touched backing store for get
    }

    #[tokio::test]
    async fn set_overwrites_stale_cache() {
        let (_fake, cached) = make_cached(Duration::from_secs(60));

        cached.set("k1", "v1").await.unwrap();
        cached.set("k1", "v2").await.unwrap();

        let entry = cached.get("k1").await.unwrap().unwrap();
        assert_eq!(entry.value, "v2");
    }

    #[tokio::test]
    async fn delete_evicts_from_cache() {
        let (fake, cached) = make_cached(Duration::from_secs(60));

        cached.set("k1", "v1").await.unwrap();

        // Confirm it's cached.
        let entry = cached.get("k1").await.unwrap().unwrap();
        assert_eq!(entry.value, "v1");
        assert_eq!(fake.get_count(), 0);

        cached.delete("k1").await.unwrap();

        // After delete, get should go to backing store and find nothing.
        let result = cached.get("k1").await.unwrap();
        assert!(result.is_none());
        assert_eq!(fake.get_count(), 1);
    }

    #[tokio::test]
    async fn expired_entry_triggers_refetch() {
        let (fake, cached) = make_cached(Duration::from_millis(0)); // instant expiry

        fake.set("k1", "v1").await.unwrap();

        // Every get should be a miss because TTL is zero.
        cached.get("k1").await.unwrap();
        cached.get("k1").await.unwrap();
        cached.get("k1").await.unwrap();
        assert_eq!(fake.get_count(), 3);
    }

    #[tokio::test]
    async fn list_all_is_not_cached() {
        let (_fake, cached) = make_cached(Duration::from_secs(60));

        cached.set("k1", "v1").await.unwrap();
        cached.set("k2", "v2").await.unwrap();

        let entries = cached.list_all().await.unwrap();
        assert_eq!(entries.len(), 2);
    }

    #[tokio::test]
    async fn works_with_config_service() {
        use crate::config::ConfigService;

        let (fake, cached) = make_cached(Duration::from_secs(60));
        let service = ConfigService::new(cached);

        service.set("app.name", "myapp").await.unwrap();
        let entry = service.get("app.name").await.unwrap();
        assert_eq!(entry.value, "myapp");

        // Only 1 set call, 0 get calls to backing store (served from cache).
        assert_eq!(fake.set_count(), 1);
        assert_eq!(fake.get_count(), 0);
    }
}

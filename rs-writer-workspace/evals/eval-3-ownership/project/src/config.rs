use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("config key not found: {0}")]
    NotFound(String),
    #[error("storage error: {0}")]
    Storage(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigEntry {
    pub key: String,
    pub value: String,
    pub version: u64,
}

#[async_trait]
pub trait ConfigStore: Send + Sync {
    async fn get(&self, key: &str) -> Result<Option<ConfigEntry>, ConfigError>;
    async fn set(&self, key: &str, value: &str) -> Result<ConfigEntry, ConfigError>;
    async fn list_all(&self) -> Result<Vec<ConfigEntry>, ConfigError>;
    async fn delete(&self, key: &str) -> Result<(), ConfigError>;
}

pub struct ConfigService<S: ConfigStore> {
    store: S,
}

impl<S: ConfigStore> ConfigService<S> {
    pub fn new(store: S) -> Self {
        Self { store }
    }

    pub async fn get(&self, key: &str) -> Result<ConfigEntry, ConfigError> {
        self.store
            .get(key)
            .await?
            .ok_or_else(|| ConfigError::NotFound(key.to_string()))
    }

    pub async fn set(&self, key: &str, value: &str) -> Result<ConfigEntry, ConfigError> {
        if key.is_empty() {
            return Err(ConfigError::NotFound("key cannot be empty".to_string()));
        }
        self.store.set(key, value).await
    }

    pub async fn list_all(&self) -> Result<Vec<ConfigEntry>, ConfigError> {
        self.store.list_all().await
    }

    pub async fn delete(&self, key: &str) -> Result<(), ConfigError> {
        // Verify it exists first
        self.get(key).await?;
        self.store.delete(key).await
    }
}

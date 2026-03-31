use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ProductError {
    #[error("product not found: {0}")]
    NotFound(String),
    #[error("invalid product: {0}")]
    Validation(String),
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub sku: String,
    pub price_cents: i64,
    pub stock: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreateProductInput {
    pub name: String,
    pub sku: String,
    pub price_cents: i64,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProductInput {
    pub name: Option<String>,
    pub sku: Option<String>,
    pub price_cents: Option<i64>,
    pub stock: Option<i32>,
}

pub struct ProductService {
    pool: sqlx::PgPool,
}

impl ProductService {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self { pool }
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Product, ProductError> {
        let product = sqlx::query_as!(
            Product,
            "SELECT id, name, sku, price_cents, stock FROM products WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| ProductError::NotFound(id.to_string()))?;

        Ok(product)
    }

    pub async fn create(&self, input: CreateProductInput) -> Result<Product, ProductError> {
        if input.name.is_empty() {
            return Err(ProductError::Validation("name is required".to_string()));
        }
        if input.price_cents <= 0 {
            return Err(ProductError::Validation("price must be positive".to_string()));
        }

        let id = uuid::Uuid::new_v4().to_string();
        let product = sqlx::query_as!(
            Product,
            "INSERT INTO products (id, name, sku, price_cents, stock) VALUES ($1, $2, $3, $4, 0) RETURNING id, name, sku, price_cents, stock",
            id, input.name, input.sku, input.price_cents
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(product)
    }

    pub async fn update(&self, id: &str, input: UpdateProductInput) -> Result<Product, ProductError> {
        // Verify the product exists first
        self.get_by_id(id).await?;

        if let Some(ref name) = input.name {
            if name.is_empty() {
                return Err(ProductError::Validation("name cannot be empty".to_string()));
            }
        }
        if let Some(price_cents) = input.price_cents {
            if price_cents <= 0 {
                return Err(ProductError::Validation("price must be positive".to_string()));
            }
        }
        if let Some(stock) = input.stock {
            if stock < 0 {
                return Err(ProductError::Validation("stock cannot be negative".to_string()));
            }
        }

        let product = sqlx::query_as!(
            Product,
            r#"UPDATE products
            SET name = COALESCE($2, name),
                sku = COALESCE($3, sku),
                price_cents = COALESCE($4, price_cents),
                stock = COALESCE($5, stock)
            WHERE id = $1
            RETURNING id, name, sku, price_cents, stock"#,
            id,
            input.name,
            input.sku,
            input.price_cents,
            input.stock
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(product)
    }

    pub async fn delete(&self, id: &str) -> Result<(), ProductError> {
        let result = sqlx::query!("DELETE FROM products WHERE id = $1", id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(ProductError::NotFound(id.to_string()));
        }

        Ok(())
    }

    pub async fn list_all(&self) -> Result<Vec<Product>, ProductError> {
        let products = sqlx::query_as!(
            Product,
            "SELECT id, name, sku, price_cents, stock FROM products"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(products)
    }
}

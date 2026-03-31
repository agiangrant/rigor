use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};

use crate::product::{
    CreateProductInput, ProductError, ProductService, UpdateProductInput,
};

/// Shared application state passed to all handlers.
pub type AppState = Arc<ProductService>;

/// Maps `ProductError` to appropriate HTTP responses.
impl IntoResponse for ProductError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            ProductError::NotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            ProductError::Validation(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            ProductError::Database(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal server error".to_string(),
            ),
        };

        let body = serde_json::json!({ "error": message });
        (status, Json(body)).into_response()
    }
}

pub async fn list_products(
    State(service): State<AppState>,
) -> Result<impl IntoResponse, ProductError> {
    let products = service.list_all().await?;
    Ok(Json(products))
}

pub async fn create_product(
    State(service): State<AppState>,
    Json(input): Json<CreateProductInput>,
) -> Result<impl IntoResponse, ProductError> {
    let product = service.create(input).await?;
    Ok((StatusCode::CREATED, Json(product)))
}

pub async fn get_product(
    State(service): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ProductError> {
    let product = service.get_by_id(&id).await?;
    Ok(Json(product))
}

pub async fn update_product(
    State(service): State<AppState>,
    Path(id): Path<String>,
    Json(input): Json<UpdateProductInput>,
) -> Result<impl IntoResponse, ProductError> {
    let product = service.update(&id, input).await?;
    Ok(Json(product))
}

pub async fn delete_product(
    State(service): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ProductError> {
    service.delete(&id).await?;
    Ok(StatusCode::NO_CONTENT)
}

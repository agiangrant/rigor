use axum::{
    routing::{delete, get, post, put},
    Router,
};

use crate::handlers::{self, AppState};

/// Builds the application router with all product endpoints.
pub fn app(state: AppState) -> Router {
    Router::new()
        .route("/products", get(handlers::list_products).post(handlers::create_product))
        .route(
            "/products/:id",
            get(handlers::get_product)
                .put(handlers::update_product)
                .delete(handlers::delete_product),
        )
        .with_state(state)
}

# Analysis: Adding HTTP Handlers for Product Service

## Current State

The project is a Rust library crate (`inventory-api`) with:

- **Cargo.toml**: Dependencies on tokio, thiserror, serde/serde_json, and sqlx (Postgres). No HTTP framework. Also uses `uuid` in code but it is missing from Cargo.toml (existing bug).
- **src/lib.rs**: Single module declaration for `product`.
- **src/product.rs**: A `ProductService` with `get_by_id`, `create`, and `list_all` methods operating on a `Product` struct via sqlx. Error handling via `ProductError` enum with `NotFound`, `Validation`, and `Database` variants.

## Key Observations

1. **No HTTP framework present** -- need to introduce one. Axum is the natural choice for this stack: it's built on tokio/hyper (already using tokio), integrates well with Tower middleware, and is the most idiomatic choice for async Rust with sqlx.
2. **No `uuid` in Cargo.toml** -- the service code calls `uuid::Uuid::new_v4()` but uuid is not listed as a dependency. This is a pre-existing issue in the project.
3. **Service holds a `PgPool` directly** -- handlers will need shared access via `Arc` or Axum's state extraction.
4. **No update/delete operations exist on the service layer** -- the task asks for full CRUD but the service only has create, get, and list. The handlers should expose what exists and add update/delete endpoints that call through to new service methods.

## Design Decisions

### Framework: Axum

- Already on tokio runtime
- State extraction via `State<T>` for sharing the service
- JSON extraction/response via serde integration
- Mature, well-maintained, idiomatic

### Architecture

- **New module `src/handlers.rs`** for HTTP handler functions
- **New `src/router.rs`** for route configuration, returns an `axum::Router`
- **Wrap `ProductService` in `Arc`** for shared state across handlers
- **Map `ProductError` to HTTP status codes** via `IntoResponse` implementation
- **Add missing CRUD operations** (update, delete) to the service layer since the task explicitly asks for CRUD

### Endpoint Design

| Method | Path | Handler | Maps To |
|--------|------|---------|---------|
| GET | `/products` | `list_products` | `ProductService::list_all` |
| POST | `/products` | `create_product` | `ProductService::create` |
| GET | `/products/:id` | `get_product` | `ProductService::get_by_id` |
| PUT | `/products/:id` | `update_product` | `ProductService::update` (new) |
| DELETE | `/products/:id` | `delete_product` | `ProductService::delete` (new) |

### Error Mapping

| ProductError | HTTP Status |
|-------------|-------------|
| NotFound | 404 |
| Validation | 400 |
| Database | 500 |

### New Dependencies

- `axum = "0.7"` -- HTTP framework
- `uuid = { version = "1", features = ["v4"] }` -- already used in code, needs to be declared

## Files to Create/Modify

1. `Cargo.toml` -- add axum and uuid dependencies
2. `src/lib.rs` -- add handler and router module declarations
3. `src/product.rs` -- add `UpdateProductInput`, `update`, and `delete` methods
4. `src/handlers.rs` -- HTTP handler functions
5. `src/router.rs` -- route configuration
6. `src/main.rs` -- application entrypoint (convert from lib-only to bin+lib)

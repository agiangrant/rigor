# Analysis: Adding HTTP Handlers for Product Service

## Codebase Scan

**Existing patterns observed:**

| Concern | Established Convention |
|---|---|
| Error handling | `thiserror` custom enums (`ProductError` with `NotFound`, `Validation`, `Database` variants) |
| Async runtime | `tokio` with `features = ["full"]` |
| Serialization | `serde` with `Serialize`/`Deserialize` derives on data types |
| Module structure | File-per-module (`lib.rs` re-exports `product` module) |
| Standard derives | `Debug, Clone, Serialize, Deserialize` on data structs; `Debug, Deserialize` on input structs |
| Database | `sqlx` with Postgres, using `query_as!` macro |
| ID generation | `uuid::Uuid::new_v4().to_string()` (note: `uuid` is used but not in Cargo.toml dependencies -- likely a latent issue) |

**What the task requires that the codebase has no convention for:**
- HTTP framework selection
- Handler function signatures and routing
- Error-to-HTTP-response mapping
- Shared state (service) passed to handlers
- Request body parsing / response serialization

---

## Pattern Decisions to Surface

### Decision 1: HTTP Framework

**What needs to be decided:** Which HTTP framework to use for the REST API.

**Option A: `axum`**

```toml
axum = "0.7"
```

```rust
use axum::{Router, routing::{get, post}, extract::{State, Path, Json}};

async fn get_product(
    State(service): State<Arc<ProductService>>,
    Path(id): Path<String>,
) -> Result<Json<Product>, AppError> {
    let product = service.get_by_id(&id).await?;
    Ok(Json(product))
}

let app = Router::new()
    .route("/products", get(list_products).post(create_product))
    .route("/products/:id", get(get_product))
    .with_state(Arc::new(service));
```

- Built by the tokio team -- first-class tokio integration, matches the project's existing runtime
- Extractor-based design composes well with typed errors
- Uses `tower` middleware ecosystem
- Most popular Rust HTTP framework (largest ecosystem, most examples, best maintained)

**Option B: `actix-web`**

```toml
actix-web = "4"
```

```rust
use actix_web::{web, HttpResponse};

async fn get_product(
    service: web::Data<ProductService>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let product = service.get_by_id(&path).await?;
    Ok(HttpResponse::Ok().json(product))
}

let app = App::new()
    .app_data(web::Data::new(service))
    .route("/products/{id}", web::get().to(get_product));
```

- Mature, battle-tested framework
- Runs its own runtime system internally -- adds complexity when the project already uses tokio directly
- Slightly heavier API surface

**Option C: `poem`**

```toml
poem = "3"
```

- Lighter weight, also tokio-native
- Smaller ecosystem and community than axum
- Good OpenAPI integration if that matters later

**Recommendation: Option A (`axum`).** The project already uses tokio with full features. axum is built by the tokio team, uses extractors that compose naturally with the existing `thiserror` error types, and has the largest ecosystem. It's the path of least friction with what already exists.

---

### Decision 2: Error-to-Response Mapping

**What needs to be decided:** How `ProductError` variants map to HTTP status codes and response bodies.

**Option A: `IntoResponse` impl on a wrapper type**

```rust
struct AppError(ProductError);

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self.0 {
            ProductError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            ProductError::Validation(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            ProductError::Database(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal error".to_string()),
        };
        (status, Json(ErrorBody { error: message })).into_response()
    }
}

impl From<ProductError> for AppError {
    fn from(e: ProductError) -> Self { AppError(e) }
}
```

- Clean separation: service layer errors stay pure, HTTP mapping is in the handler layer
- `?` works naturally in handlers via `From` impl
- Extensible -- other service errors get their own `From` impl into the same `AppError`

**Option B: Implement `IntoResponse` directly on `ProductError`**

```rust
impl IntoResponse for ProductError {
    fn into_response(self) -> Response { ... }
}
```

- Simpler (no wrapper)
- Couples the service layer to axum -- `product.rs` would need to depend on axum types
- Violates the existing clean separation between service and framework

**Recommendation: Option A (wrapper type).** The existing code has a clean service layer with no HTTP concerns. A wrapper type in the handler module preserves that separation and allows `?` ergonomics without coupling `ProductError` to axum.

---

### Decision 3: Shared State Pattern

**What needs to be decided:** How `ProductService` is shared across handler functions.

**Option A: `Arc<ProductService>` via axum `State`**

```rust
let service = Arc::new(ProductService::new(pool));
Router::new().with_state(service);

// In handlers:
async fn get_product(State(service): State<Arc<ProductService>>, ...) { ... }
```

- Idiomatic axum pattern
- `ProductService` holds a `PgPool` which is already internally `Arc`-ed, so this is just wrapping the service struct itself
- Simple, no mutex needed since service methods take `&self`

**Option B: `Arc<ProductService>` via axum `Extension`**

```rust
Router::new().layer(Extension(Arc::new(service)));
```

- Older axum pattern (pre-0.6)
- Not type-safe at the router level
- No advantage over `State`

**Recommendation: Option A (`State` extractor with `Arc`).** This is the idiomatic axum pattern. Since `ProductService` methods all take `&self` (no mutation), `Arc` alone is sufficient -- no `Mutex` needed. The inner `PgPool` handles its own connection pooling.

---

### Decision 4: Module Structure for HTTP Layer

**What needs to be decided:** Where the handler code lives.

**Option A: `src/handlers/product.rs` with `src/handlers/mod.rs`**

```
src/
  lib.rs
  product.rs          # service layer (existing)
  handlers/
    mod.rs             # re-exports, router builder
    product.rs         # product HTTP handlers
```

**Option B: `src/api.rs` (flat)**

```
src/
  lib.rs
  product.rs          # service layer (existing)
  api.rs              # all handlers + router + error mapping
```

**Option C: `src/routes.rs` + `src/errors.rs`**

```
src/
  lib.rs
  product.rs
  routes.rs           # handlers + router
  errors.rs           # AppError + IntoResponse
```

**Recommendation: Option A if you expect multiple resource types soon, Option B if this stays small.** Given the project is called `inventory-api` and products are just the first resource, **Option A** is the better bet -- it creates a pattern that scales to `handlers/inventory.rs`, `handlers/order.rs`, etc. without refactoring.

---

## Summary of Decisions Needed

| # | Decision | Recommendation |
|---|---|---|
| 1 | HTTP framework | `axum` (tokio-native, extractor-based) |
| 2 | Error-to-response mapping | Wrapper `AppError` type with `IntoResponse` |
| 3 | Shared state | `Arc<ProductService>` via axum `State` extractor |
| 4 | Module structure | `src/handlers/` directory with per-resource files |

**Please confirm or adjust these decisions before I proceed with implementation.**

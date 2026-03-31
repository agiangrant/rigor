# Analysis: HTTP Handlers for Todo Service

## Existing Code

The project has two packages:

- **`todo`** — Domain types (`Todo`, `CreateInput`, `UpdateInput`), a `Store` interface, and a `Service` struct that implements CRUD business logic. Sentinel errors `ErrNotFound` and `ErrValidation` are used for error signaling.
- **`store`** — Empty. The `Store` interface is defined in `todo` but no concrete implementation exists yet.
- **`go.mod`** — Module `github.com/example/todoapi`, Go 1.22, depends on `github.com/lib/pq`.

## Key Design Observations

1. **Service is the boundary.** The `Service` struct already encapsulates all business logic. The HTTP layer should be a thin adapter that translates HTTP requests to `Service` calls and `Service` results to HTTP responses.
2. **Error types drive HTTP status codes.** `ErrNotFound` maps to 404, `ErrValidation` maps to 400, everything else maps to 500.
3. **`UpdateInput` uses pointer fields** for partial updates (PATCH semantics).
4. **`UserID` is on `CreateInput` and `ListByUser`** — the API needs a way to identify the user. For simplicity, a `X-User-ID` header or path parameter works. I'll use a path segment for list and a request body field for create, matching the service interface.
5. **IDs are opaque strings** generated server-side.

## REST API Design

| Method | Path | Service Method | Notes |
|--------|------|---------------|-------|
| POST | `/todos` | `Create` | Body: `{title, description, user_id}` |
| GET | `/todos/{id}` | `GetByID` | |
| PATCH | `/todos/{id}` | `Update` | Body: `{title?, description?, done?}` |
| DELETE | `/todos/{id}` | `Delete` | |
| GET | `/users/{user_id}/todos` | `ListByUser` | |

## Implementation Plan

1. **`handler/handler.go`** — HTTP handler struct wrapping `*todo.Service`, a `Register` method to wire routes onto an `*http.ServeMux`, JSON encode/decode helpers, error-to-status mapping.
2. **`handler/handler_test.go`** — Table-driven tests using `httptest`, with a mock store driving the service. Covers success paths, 404, 400, and 500 for each endpoint.

### Decisions Made Silently

- Use stdlib `net/http` only (no third-party router). Go 1.22 `ServeMux` supports method and path-parameter matching (`GET /todos/{id}`).
- JSON throughout, `Content-Type: application/json`.
- No authentication — `user_id` comes from the request body/path as the service interface expects.
- No pagination on list (service doesn't support it).

### Decisions Worth Surfacing

- **PATCH vs PUT for updates**: Using PATCH because `UpdateInput` has pointer fields designed for partial updates.
- **User scoping on GET/PATCH/DELETE single todo**: The service's `GetByID` does not check user ownership. The HTTP layer will mirror this — no user-scoping on single-todo operations. This matches the existing service contract.

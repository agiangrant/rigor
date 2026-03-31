# Analysis: HTTP Handlers for Todo Service

## Codebase Scan

### What exists
- `go.mod`: module `github.com/example/todoapi`, Go 1.22, depends on `github.com/lib/pq`
- `todo/todo.go`: Domain types (`Todo`, `CreateInput`, `UpdateInput`), `Store` interface, `Service` with full CRUD (GetByID, ListByUser, Create, Update, Delete)
- `todo/todo_test.go`: Standard library tests, function-based mocks, subtests with `t.Run`
- `store/`: Empty directory (placeholder for store implementations)

### Established conventions
- **Error handling**: Sentinel errors (`ErrNotFound`, `ErrValidation`) + `fmt.Errorf("...: %w", err)` wrapping
- **DI**: Constructor injection (`NewService(s Store) *Service`)
- **Testing**: Standard library only, no testify, function-based mock structs
- **Package structure**: Domain-based, flat
- **Naming**: Standard Go, no stutter
- **No HTTP layer exists** -- this is an entirely new pattern

## Pattern Decisions to Surface

The codebase has no HTTP conventions established. Three decisions need to be made before writing code.

---

### Decision 1: HTTP Router

The project has no router dependency. `go.mod` only has `github.com/lib/pq`.

**Option A: `net/http` standard library (Go 1.22 ServeMux)**

Go 1.22 added method-based routing to the standard `http.ServeMux` (`mux.HandleFunc("GET /todos/{id}", h.Get)`). No external dependency needed.

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /todos/{id}", h.GetByID)
mux.HandleFunc("GET /todos", h.ListByUser)
mux.HandleFunc("POST /todos", h.Create)
mux.HandleFunc("PATCH /todos/{id}", h.Update)
mux.HandleFunc("DELETE /todos/{id}", h.Delete)
```

- Fits the project's minimal dependency approach (only one dep so far)
- Go 1.22 is specified in go.mod, so the enhanced ServeMux is available
- Path parameters via `r.PathValue("id")`
- No middleware chaining built in, but middleware is just `func(http.Handler) http.Handler`

**Option B: chi**

```go
r := chi.NewRouter()
r.Get("/todos/{id}", h.GetByID)
r.Get("/todos", h.ListByUser)
r.Post("/todos", h.Create)
r.Patch("/todos/{id}", h.Update)
r.Delete("/todos/{id}", h.Delete)
```

- Adds a dependency, but chi is lightweight and `net/http` compatible
- Built-in middleware stack, route groups
- Path parameters via `chi.URLParam(r, "id")`

**Recommendation**: Option A (`net/http` with Go 1.22 ServeMux). The project targets Go 1.22 and has a minimal dependency footprint. The enhanced ServeMux covers everything needed here. Adding chi is reasonable if route grouping or middleware chaining becomes necessary later, but for a single-resource CRUD API it's unnecessary overhead.

---

### Decision 2: Handler Package Structure

Where do the HTTP handlers live?

**Option A: New `api/` package**

```
api/
  handler.go      // Handler struct + constructor
  handler_test.go // Tests
  request.go      // Request/response types, JSON encode/decode helpers
todo/
  todo.go
  todo_test.go
```

- Clean separation of HTTP concerns from domain
- `api` package imports `todo` package (dependency flows inward)
- Handler defines its own interface for the service methods it needs (accept interfaces at the consumer)

**Option B: `http/` package (or `server/`)**

```
http/
  handler.go
  handler_test.go
todo/
  todo.go
  todo_test.go
```

- `http` as a package name shadows the stdlib `net/http` -- forces aliasing everywhere (`nethttp "net/http"`)
- `server/` avoids the shadowing but is vague

**Option C: Inside `todo/` package**

```
todo/
  todo.go
  todo_test.go
  handler.go
  handler_test.go
```

- Keeps everything together, fewer packages
- Mixes HTTP transport concerns with domain logic in one package
- Harder to swap transports later

**Recommendation**: Option A (`api/` package). It follows the accept-interfaces-return-structs pattern naturally -- the handler defines a small interface for the service methods it consumes. It keeps HTTP transport separate from domain logic. The name `api` is concise and doesn't shadow stdlib packages.

---

### Decision 3: Service Interface at the Consumer

Following the Go idiom "define interfaces at the consumer," the handler should define its own interface rather than importing `todo.Store` or depending on `*todo.Service` directly.

**Option A: Define a `TodoService` interface in the `api` package**

```go
// In api/handler.go
type TodoService interface {
    GetByID(id string) (*todo.Todo, error)
    ListByUser(userID string) ([]*todo.Todo, error)
    Create(input todo.CreateInput) (*todo.Todo, error)
    Update(id string, input todo.UpdateInput) (*todo.Todo, error)
    Delete(id string) error
}

type Handler struct {
    todos TodoService
}
```

- Idiomatic Go: consumer defines what it needs
- Easy to mock in handler tests
- `*todo.Service` satisfies this interface implicitly

**Option B: Accept `*todo.Service` directly**

```go
type Handler struct {
    todos *todo.Service
}
```

- Simpler, fewer types
- Harder to test handlers in isolation (need a full `todo.Service` with a mock store)
- Violates accept-interfaces-return-structs

**Recommendation**: Option A. The codebase already uses this pattern (the `Store` interface exists for exactly this reason). Defining `TodoService` at the handler level keeps tests clean and follows the established convention.

---

## Summary

Three decisions need confirmation before implementation:

| # | Decision | Recommendation |
|---|----------|---------------|
| 1 | HTTP Router | `net/http` standard library (Go 1.22 ServeMux) |
| 2 | Handler package structure | New `api/` package |
| 3 | Service dependency in handler | Interface defined at the consumer (`TodoService` in `api/`) |

**Awaiting confirmation on these decisions before writing implementation code.**

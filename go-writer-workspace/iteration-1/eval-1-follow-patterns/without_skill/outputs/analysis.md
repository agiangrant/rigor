# Pattern Analysis

## Project Structure

- Module: `github.com/example/taskapp`, Go 1.22
- Each domain lives in its own package (`user/`, `store/`)
- Domain package contains: model struct, input structs, sentinel errors, Store interface, Service struct, and tests — all in one package

## Patterns Identified

### Naming & Organization
- Package-per-domain: `user/user.go`, `user/user_test.go`
- Store implementations live in `store/` package, importing the domain package
- No `internal/` or nested packages — flat structure

### Domain Model
- Struct fields: `ID string`, domain fields, `CreatedAt time.Time`
- ID format: prefix + unix nano (`usr_<nano>`)
- Input structs for creation: `CreateInput` with only caller-supplied fields (no ID, no timestamps)

### Error Handling
- Package-level sentinel errors using `errors.New`
- Named `Err<Condition>`: `ErrNotFound`, `ErrAlreadyExists`, `ErrInvalidEmail`
- Service methods wrap store errors with `fmt.Errorf("doing thing: %w", err)`
- Store returning `(nil, nil)` means "not found" — service converts to `ErrNotFound`

### Store Interface
- Defined in the domain package (not the store package)
- Methods: `FindByID`, `FindByEmail`, `FindAll`, `Create`
- Pointer returns for single entities: `(*User, error)`
- Slice of pointers for lists: `([]*User, error)`
- Create takes the full entity pointer, returns only `error`

### Service
- Constructor: `NewService(s Store) *Service`
- Service holds unexported `store` field
- Methods return `(*Entity, error)`

### Tests
- In-package tests (same package, not `_test`)
- Mock struct with function fields matching the Store interface
- Each interface method delegated: `func (m *mockStore) Method(args) { return m.method(args) }`
- Table-style subtests with `t.Run("description", ...)`
- Assertions use `t.Fatalf` for unexpected errors, `t.Errorf` for wrong values
- `errors.Is` for sentinel error checks
- Capture pattern: `var created *Entity` to verify store interactions

## Task Service Design Decisions

- Package: `task/task.go`, `task/task_test.go`
- Status type: `string` with constants (`StatusOpen`, `StatusInProgress`, `StatusDone`)
- `assigneeId` and `projectId` are `string` fields (matching the `ID string` pattern from user)
- Store interface: `FindByID`, `FindByProject`, `Create`, `Update`
- Service methods: `Create`, `GetByID`, `ListByProject`, `Update`, `ChangeStatus`
- `ChangeStatus` is a separate method (not just Update) per the task requirements
- Validation: title required, status must be valid, projectId required
- ID format: `tsk_<nano>`

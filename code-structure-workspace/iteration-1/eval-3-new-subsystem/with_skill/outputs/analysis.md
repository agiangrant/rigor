# Structural Analysis: Real-Time Task Updates via WebSocket

## Existing Structure

```
src/
  api/
    controllers/   # HTTP request handlers (taskController.ts, projectController.ts)
    validators/    # Input validation (taskValidator.ts)
  domain/
    models/        # Type definitions (task.ts, project.ts)
    services/      # Business logic (taskService.ts, projectService.ts)
  infrastructure/
    database/      # Persistence (taskRepo.ts, projectRepo.ts)
    cache/         # Redis client (redisClient.ts)
```

**Pattern**: Layered architecture. Top level splits by architectural layer (`api`, `domain`, `infrastructure`). Each layer has sub-directories grouped by concern. Files use camelCase naming. The `api` layer handles inbound HTTP; `domain` owns business logic and models; `infrastructure` wraps external systems.

## What We Are Adding

Real-time task updates require:

1. **WebSocket server/connection management** — accepting connections, tracking which users are connected, associating connections with projects
2. **WebSocket event handlers** — the equivalent of controllers but for WebSocket messages (subscribing to project updates, handling disconnects)
3. **Event publishing** — when `TaskService.create()` or `TaskService.update()` runs, it needs to notify connected clients on the same project
4. **Event types/contracts** — the shape of real-time messages sent to clients

This cuts across all three existing layers and introduces concepts that have no current home.

## Classification

**Creating something genuinely new.** There is no existing WebSocket infrastructure, no event/pub-sub system, and no real-time handlers. Multiple new directories would need to be created. This requires a human decision before any files are created.

## Options

### Option A: Mirror the existing layers — add WebSocket concerns to each layer

```
src/
  api/
    controllers/
    validators/
    ws/                          # NEW — WebSocket handlers alongside HTTP
      taskWSHandler.ts           #   handles subscribe/unsubscribe for task updates
      connectionManager.ts       #   tracks active connections per project
  domain/
    models/
    services/
    events/                      # NEW — domain event types and publisher
      taskEvents.ts              #   event type definitions (TaskCreated, TaskUpdated)
      eventBus.ts                #   in-process pub/sub for domain events
  infrastructure/
    database/
    cache/
    ws/                          # NEW — WebSocket server setup
      wsServer.ts                #   raw WebSocket server initialization
```

**Why this makes sense**: Follows the existing layered pattern. WebSocket handlers are an API concern (they handle inbound messages like controllers handle HTTP requests). The WebSocket server itself is infrastructure (an external transport, like the database). Domain events belong in domain.

**Trade-offs**:
- (+) Consistent with the existing layered split — each new piece goes into the layer it belongs to
- (+) Clear separation: infra owns the server, api owns the handlers, domain owns the events
- (-) WebSocket code is spread across three directories — harder to see the full real-time subsystem at a glance
- (-) `api/ws/` could feel awkward since `api/` has so far been purely HTTP

### Option B: Create a top-level `realtime/` (or `ws/`) layer

```
src/
  api/
  domain/
  infrastructure/
  realtime/                      # NEW — all WebSocket/real-time code together
    wsServer.ts                  #   server setup and connection management
    taskWSHandler.ts             #   handles subscribe/unsubscribe for task updates
    connectionManager.ts         #   tracks connections per project
  domain/
    events/                      # NEW — domain events still live in domain
      taskEvents.ts
      eventBus.ts
```

**Why this makes sense**: Real-time is a distinct subsystem with its own lifecycle. Grouping it together makes the feature easy to find and reason about as a unit. The domain event bus still lives in `domain/` since it is a domain concern that other subsystems (email notifications, audit logs) might also use.

**Trade-offs**:
- (+) Easy to find all real-time code in one place
- (+) Cleaner if real-time grows to include presence, typing indicators, etc.
- (-) Introduces a new top-level directory that breaks the pure layer-based pattern — the existing three directories are architectural layers, and `realtime/` is more of a feature/subsystem
- (-) The WebSocket server is arguably infrastructure, and handlers are arguably API — splitting them out muddies the layered boundaries

### Option C: Treat WebSocket as a second transport in `api/`, keep infra in `infrastructure/`

```
src/
  api/
    controllers/                 # HTTP handlers (unchanged)
    validators/                  # Input validation (unchanged)
    handlers/                    # NEW — WebSocket message handlers
      taskWSHandler.ts
    ws/                          # NEW — connection-level concerns
      connectionManager.ts
  domain/
    models/
    services/
    events/                      # NEW — domain events
      taskEvents.ts
      eventBus.ts
  infrastructure/
    database/
    cache/
    ws/                          # NEW — WebSocket server setup
      wsServer.ts
```

**Why this makes sense**: Similar to Option A but separates "handlers" (business-facing message handling) from "ws" (connection management plumbing) within the API layer, mirroring the controllers/validators split.

**Trade-offs**:
- (+) More granular separation within `api/`
- (-) Potentially over-engineered for the current scope — only one handler exists
- (-) The distinction between `api/handlers/` and `api/ws/` may be unclear to other developers

## Recommendation

**Option A** is the strongest fit. It extends the existing layered pattern without breaking it. Each new piece has a clear home based on the same architectural rules the project already follows. It is also the most straightforward to implement — three new sub-directories, each under an existing top-level layer, with clear analogies to what already exists (handlers are like controllers, wsServer is like redisClient, events are a domain concern).

However, this is an architectural decision that affects where future real-time features will land. **The human should confirm before any files are created.**

## Awaiting Decision

Please confirm which option to proceed with (A, B, or C), or propose an alternative. No implementation files have been created.

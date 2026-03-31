# Analysis: Adding Real-Time Collaboration via WebSockets

## Existing Architecture

The project follows a clean layered architecture:

```
src/
  api/
    controllers/    # HTTP request handlers (TaskController, ProjectController)
    validators/     # Input validation (taskValidator)
  domain/
    models/         # Type definitions (Task, Project)
    services/       # Business logic (TaskService, ProjectService)
  infrastructure/
    cache/          # Redis client
    database/       # Repository layer (taskRepo, projectRepo)
```

**Key patterns observed:**
- Static class methods for services and controllers
- Thin controllers that delegate to services
- Services delegate to repos in infrastructure
- Models are plain TypeScript interfaces
- Infrastructure layer wraps external systems (Redis, database)
- No dependency injection -- direct imports throughout

## What Needs to Change

To add real-time task updates, we need:

1. **WebSocket server infrastructure** (`infrastructure/websocket/`) -- manages connections and rooms
2. **Event types** (`domain/models/taskEvent.ts`) -- defines the shape of real-time task events
3. **A notification service** (`domain/services/taskNotificationService.ts`) -- bridges task mutations to WebSocket broadcasts
4. **Modified TaskService** -- emits events after create/update operations
5. **WebSocket controller** (`api/controllers/wsController.ts`) -- handles connection lifecycle and room subscriptions

## Design Decisions

### Room-based broadcasting by projectId
Tasks belong to projects. Users working on the same project should see each other's changes. The natural room key is `project:{projectId}`. When a task is created or updated, we broadcast to that project's room.

### Event model
Rather than sending the full task list, we send granular events (`task:created`, `task:updated`) with the affected task payload. This is bandwidth-efficient and lets clients apply optimistic updates.

### Separation of concerns
- The WebSocket server itself lives in `infrastructure/` because it's a transport concern, like the database or Redis.
- The notification service lives in `domain/services/` because deciding *what* to broadcast is business logic.
- The WS controller lives in `api/controllers/` to match the existing pattern for handling incoming connections.

### No changes to existing files in outputs
Per the instructions, we write new files that would integrate with the existing codebase. The TaskService would need to call `TaskNotificationService.notifyTaskCreated()` and `notifyTaskUpdated()` after its mutations -- that integration point is documented but the original file is not modified.

## New Files

| File | Layer | Purpose |
|------|-------|---------|
| `src/infrastructure/websocket/wsServer.ts` | Infrastructure | WebSocket server, connection management, room pub/sub |
| `src/domain/models/taskEvent.ts` | Domain | Event type definitions for real-time updates |
| `src/domain/services/taskNotificationService.ts` | Domain | Bridges task mutations to WebSocket broadcasts |
| `src/api/controllers/wsController.ts` | API | Handles WS connection lifecycle and room joins |

## Integration Points (changes needed in existing files, not included in outputs)

1. **`taskService.ts`** -- After `taskRepo.create()` and `taskRepo.update()`, call `TaskNotificationService.notifyTaskCreated(task)` and `TaskNotificationService.notifyTaskUpdated(task)` respectively.
2. **App bootstrap** -- Initialize `WsServer` with the HTTP server instance, then register `WsController` to handle connections.

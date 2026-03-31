# Analysis: Move Order Side-Effects to Background Processing

## Problem

The `POST /orders` endpoint in `routes.py` calls three slow service methods synchronously after creating the order:

1. `send_confirmation_email` -- ~1s (SMTP)
2. `generate_invoice` -- ~1.5s (PDF generation)
3. `notify_warehouse` -- ~0.5s (webhook)

Total blocking time: ~3 seconds added to every order creation response.

## Constraints

- Sync Flask app (no async, no Celery)
- Redis already in `requirements.txt`
- Must not modify original project files

## Approach: Redis Queue (rq)

**Why rq over alternatives:**

- `rq` is the simplest Redis-backed task queue for Python. It works with sync code, requires minimal boilerplate, and Redis is already a dependency.
- Celery is overkill for three simple tasks in a sync Flask app.
- Threading (`concurrent.futures`) would work but offers no persistence, no retry, no visibility into failed jobs. Redis-backed queues give us all three.

**Design decisions:**

1. **New module `app/tasks.py`** -- Contains standalone functions that `rq` can serialize and dispatch. These call through to `OrderService` methods. Kept separate from services to maintain the existing service layer unchanged.

2. **Route change** -- Replace three synchronous calls with three `queue.enqueue()` calls. The endpoint returns immediately after creating the order. Background workers pick up the tasks.

3. **`app/__init__.py` change** -- Configure a Redis connection and `rq.Queue` instance on the app, so routes can access it.

4. **Testability** -- Tests mock the Redis queue (or use `is_async=False` mode of rq) so no running Redis is needed for unit tests. The key behavior to test: tasks are enqueued (not executed inline), and the task functions themselves work correctly when called directly.

5. **Requirements** -- Add `rq` to `requirements.txt`.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `requirements.txt` | Modified copy | Add `rq` |
| `app/__init__.py` | Modified copy | Wire up Redis + Queue |
| `app/routes.py` | Modified copy | Enqueue instead of call directly |
| `app/tasks.py` | New | Task functions for rq workers |
| `app/services.py` | Unchanged copy | No modifications needed |
| `tests/test_tasks.py` | New | Test enqueue behavior and task functions |
| `tests/test_routes.py` | New | Test endpoint enqueues rather than blocking |
| `tests/test_services.py` | Unchanged copy | Existing tests still valid |

## Risk Assessment

- **Low risk**: The service layer is untouched. Side-effect functions already exist and work; we just change when they run.
- **Failure mode**: If Redis is down, `enqueue()` raises an exception. The route should handle this gracefully -- we add a try/except that logs the error but still returns the created order (degraded mode: order created, side-effects lost). This is a product decision worth surfacing, but for now we fail open since the order itself was already persisted.

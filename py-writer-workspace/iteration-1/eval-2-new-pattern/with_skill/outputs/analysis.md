# Analysis: Background Processing for Order Creation

## Problem

The `POST /orders` endpoint in `app/routes.py` calls three side-effect methods synchronously after creating an order:

1. `send_confirmation_email` (~1s) - SMTP
2. `generate_invoice` (~1.5s) - PDF generation
3. `notify_warehouse` (~0.5s) - webhook

Total blocking time: ~3 seconds added to every order response.

## Codebase Scan

| Aspect | Finding |
|---|---|
| Framework | Sync Flask 3.0.0 |
| Python version | 3.x, partial type hints on service methods |
| Data modeling | Plain dicts |
| Testing | pytest, `test_*.py`, no fixtures or mocks, no conftest |
| Dependencies | `flask==3.0.0`, `redis==5.0.0` (present but unused) |
| Async | None. Fully synchronous codebase. |
| Module structure | Flat `app/` package, absolute imports |
| Error handling | No custom exceptions, no error handling visible |

## Pattern Decision Required

**What decision needs to be made:** How to implement background task processing in a sync Flask app.

This is a new pattern for this codebase -- there is no existing convention for background work. Three viable options exist given the constraints (sync Flask, Redis already available):

---

### Option A: Celery with Redis broker

```python
# app/tasks.py
from celery import Celery

celery_app = Celery("orders", broker="redis://localhost:6379/0")

@celery_app.task
def send_confirmation_email(order: dict) -> None:
    # existing logic moves here
    ...

@celery_app.task
def generate_invoice(order: dict) -> None:
    ...

@celery_app.task
def notify_warehouse(order: dict) -> None:
    ...
```

```python
# app/routes.py (change)
from app.tasks import send_confirmation_email, generate_invoice, notify_warehouse

@bp.route("/orders", methods=["POST"])
def create_order():
    data = request.get_json()
    order = order_service.create(user_id=data["user_id"], items=data["items"])
    send_confirmation_email.delay(order)
    generate_invoice.delay(order)
    notify_warehouse.delay(order)
    return jsonify(order), 201
```

**Composes with existing code:** Natural fit with sync Flask. Well-documented pattern. Tasks are plain functions, matching the project's function-oriented style.

**Trade-offs:**
- (+) Industry standard for Flask background processing
- (+) Retry policies, dead-letter queues, monitoring (flower) come free
- (+) Separate worker process means task failures don't affect the web process
- (+) Uses the Redis already in requirements.txt
- (-) Adds a dependency (`celery`) and an operational requirement (worker process)
- (-) Heavier than needed if these three tasks are the only background work
- (-) Celery configuration can be non-trivial (serialization, result backends, etc.)

**Requires:** `celery[redis]` added to requirements.txt, a `celery worker` process running alongside Flask.

---

### Option B: RQ (Redis Queue)

```python
# app/tasks.py
from redis import Redis
from rq import Queue

redis_conn = Redis()
task_queue = Queue(connection=redis_conn)

def enqueue_post_order_tasks(order: dict) -> None:
    from app.services import OrderService
    svc = OrderService()
    task_queue.enqueue(svc.send_confirmation_email, order)
    task_queue.enqueue(svc.generate_invoice, order)
    task_queue.enqueue(svc.notify_warehouse, order)
```

```python
# app/routes.py (change)
from app.tasks import enqueue_post_order_tasks

@bp.route("/orders", methods=["POST"])
def create_order():
    data = request.get_json()
    order = order_service.create(user_id=data["user_id"], items=data["items"])
    enqueue_post_order_tasks(order)
    return jsonify(order), 201
```

**Composes with existing code:** Minimal disruption. Existing service methods stay as-is -- RQ can call them directly. Matches the project's simplicity.

**Trade-offs:**
- (+) Much simpler than Celery -- designed for exactly this use case
- (+) Existing service methods can be enqueued directly without decoration
- (+) Redis already in requirements.txt; RQ is a thin layer on top
- (+) Worker is a single `rq worker` command
- (+) Easy to test -- `SimpleWorker` runs tasks synchronously in tests
- (-) Less feature-rich than Celery (no task chaining, limited retry support)
- (-) Adds a dependency (`rq`) and a worker process
- (-) Smaller ecosystem than Celery

**Requires:** `rq` added to requirements.txt, an `rq worker` process running alongside Flask.

---

### Option C: Custom Redis queue (no new dependencies)

```python
# app/tasks.py
import json
from redis import Redis

redis_client = Redis()

def enqueue_task(task_name: str, payload: dict) -> None:
    redis_client.rpush("order_tasks", json.dumps({"task": task_name, "payload": payload}))

def process_tasks() -> None:
    """Run as a separate script/process."""
    svc = OrderService()
    handlers = {
        "send_confirmation_email": svc.send_confirmation_email,
        "generate_invoice": svc.generate_invoice,
        "notify_warehouse": svc.notify_warehouse,
    }
    while True:
        _, raw = redis_client.blpop("order_tasks")
        msg = json.loads(raw)
        handlers[msg["task"]](msg["payload"])
```

**Composes with existing code:** No new deps since Redis is already present. But introduces a hand-rolled task dispatch system.

**Trade-offs:**
- (+) Zero new dependencies
- (+) Full control over serialization and dispatch
- (-) Reinvents what RQ/Celery already solve
- (-) No retries, no dead-letter queue, no monitoring without building it yourself
- (-) More code to maintain and more surface area for bugs
- (-) Not a recognized pattern -- harder for new contributors to understand

**Requires:** A custom worker script, error handling, and serialization decisions you'd need to make yourself.

---

## Recommendation

**Option B (RQ)** is the best fit for this codebase.

Reasoning:
1. The project is small and simple -- Celery's operational complexity is not justified for three tasks.
2. Redis is already a dependency, and RQ is a thin, focused layer on top of it.
3. Existing service methods can be enqueued without modification, preserving the current code structure.
4. RQ's `SimpleWorker` makes testing straightforward without complex mocking.
5. Option C (custom queue) solves the same problem with more code and fewer guarantees.
6. If the project grows to need Celery-level features, migrating from RQ is straightforward.

## Awaiting Confirmation

Which option should I implement? Or should I adjust any of these approaches?

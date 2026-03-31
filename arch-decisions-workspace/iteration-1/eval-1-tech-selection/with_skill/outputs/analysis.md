# Architecture Decision: Background Processing for Order Creation

## 1. Understanding the Decision

### What is the actual decision?

This is not "which queue library should we use?" — it's **how should we decouple synchronous post-order side effects from the critical path of order creation, given our existing infrastructure?**

The `createOrder` method currently performs four sequential operations after inserting the order:
1. Send confirmation email (~500ms, SMTP)
2. Generate invoice PDF (~800ms, external service)
3. Update inventory (~200ms, database)
4. Notify warehouse (~500ms, webhook)

Total: ~2 seconds of blocking work that the customer waits for, none of which needs to complete before the order response is returned.

### What triggered this decision?

Performance. Users are experiencing 2-3 second checkout times. The TODO comment in `orderService.ts` confirms this is a known problem: *"These should not block the API response. Currently takes 2-3 seconds and users are complaining about slow checkout."*

### Constraints from the codebase

- **Stack**: Node.js/TypeScript, Express, PostgreSQL, Redis, Nodemailer
- **Redis is already deployed**: It's in `package.json` (`redis: ^4.6.0`), configured in `src/infrastructure/redis.ts`, and currently used for session storage. This is significant — Redis is already in the infrastructure, already paid for, already monitored.
- **No existing queue or worker infrastructure**: There's no Bull, BullMQ, or any other job queue library. No worker process configuration. This is a greenfield decision for background processing.
- **Simple service architecture**: This appears to be a single-service application (Express + Postgres + Redis), not a microservices setup. There's no evidence of message brokers, service mesh, or event-driven patterns elsewhere.
- **The side effects have different failure characteristics**:
  - **Email**: Can be retried. Failure doesn't affect order correctness. User can request resend.
  - **PDF generation**: Can be retried. Generated on demand if missing. External dependency.
  - **Inventory update**: More critical. If this fails silently, inventory counts drift. Needs reliable execution.
  - **Warehouse notification**: External webhook. Can be retried. Warehouse likely has its own reconciliation.

### What this decision interacts with

- The existing Redis infrastructure (potential to reuse or overload)
- The deployment model (adding worker processes changes how the app is deployed and scaled)
- Error handling strategy (synchronous errors are easy to reason about; async failures need monitoring and retry logic)
- The email service pattern (other email methods like `sendShippingNotification` and `sendRefundConfirmation` would likely benefit from the same background processing)

---

## 2. Research Findings

### What the codebase tells us

- **Redis is available but lightly used.** The comment says "currently used only for session storage." This means we can leverage it for job queues without introducing new infrastructure.
- **No worker process exists.** Whatever solution we pick, we need to introduce the concept of a background worker. This affects deployment, monitoring, and operational complexity.
- **The side effects are independent.** None of the four operations depend on each other. They can run in parallel, not just asynchronously.
- **There's no error handling on the side effects today.** If `sendOrderConfirmation` throws, `generateInvoicePdf` never runs. Moving to background processing actually *improves* reliability by isolating failures.
- **The project uses vitest for testing.** Whatever we pick needs to be testable — ideally with an in-memory mode or easy mocking.

### What the codebase doesn't tell us

- How this is deployed (single process? Docker? Kubernetes? serverless?)
- Whether there are other places in the codebase with similar synchronous-side-effect patterns
- Current order volume and whether it's expected to grow significantly
- Whether there's an ops team monitoring infrastructure, or if this is a small team where simplicity matters more

---

## 3. Questions for the Human

These questions would change my recommendation. Please answer before I proceed to implementation.

**Deployment model**: How is this deployed? Single process on a VM? Docker containers? Kubernetes? Serverless?
- *Why it matters*: If you're on Kubernetes, running a separate worker deployment is trivial. If you're on a single VM with `pm2`, adding a worker process is still easy but different. If you're serverless, the approach changes entirely.

**Inventory update criticality**: If the inventory update fails after order creation, what happens? Is there a reconciliation process, or would inventory drift silently?
- *Why it matters*: This determines whether we need guaranteed delivery (a real job queue with persistence and retries) or whether fire-and-forget with best-effort retry is acceptable for all four tasks. Email and PDF are clearly retryable/non-critical. Inventory might not be.

**Expected growth**: Are you processing 10 orders/day or 10,000? Is there a foreseeable spike scenario (flash sale, launch)?
- *Why it matters*: At low volume, simpler solutions work fine. At high volume or with spike scenarios, you need backpressure, rate limiting, and potentially dedicated queue infrastructure.

**Team size and ops capability**: Is there a dedicated ops/platform team, or does the dev team own the infrastructure?
- *Why it matters*: More sophisticated solutions (dedicated message brokers, separate worker services) require more operational maturity. If the team is small, simpler is better even if it's theoretically less capable.

---

## 4. Options

### Option A: BullMQ with existing Redis

Use [BullMQ](https://docs.bullmq.io/) — a mature, Redis-backed job queue for Node.js — to process side effects in a worker.

**What it looks like concretely:**

- Add `bullmq` as a dependency.
- Define a queue (e.g., `order-post-processing`) and individual job types for each side effect.
- `createOrder` inserts the order, enqueues a job with the order data, and returns immediately.
- A separate worker process (or a worker running in the same process during development) picks up jobs and executes the side effects.
- Each job type gets its own retry configuration (e.g., email retries 3x with exponential backoff, inventory retries 5x with shorter intervals).

**Trade-offs:**

- *Uses existing Redis infrastructure.* No new services to deploy or pay for. Redis is already running, already configured, already in `package.json`.
- *BullMQ is battle-tested.* It's the most widely used Node.js job queue. It handles retries, backoff, concurrency control, rate limiting, job prioritization, and delayed jobs out of the box.
- *Adds a worker process to the deployment.* You now have two things to run: the API server and the worker. This is a small but real operational change.
- *Redis becomes a more critical piece of infrastructure.* It's currently just session storage (losing sessions is annoying, not catastrophic). If it's also your job queue, Redis downtime means background jobs stop processing. Jobs are persisted and will resume when Redis comes back, but there's a gap.
- *Dashboard available.* BullMQ has a companion UI (`@bull-board/express`) for monitoring queues, inspecting failed jobs, and manual retries. Useful for debugging.
- *Testable.* BullMQ jobs can be tested by calling the processor function directly, or by using `IORedis` mock libraries.

**What it enables:**
- Easy to extend to other async work (shipping notifications, refund emails, reports).
- Job scheduling (e.g., send a "how was your order?" email 7 days later).
- Rate limiting external API calls (e.g., warehouse webhook rate limits).
- Priority queues if some jobs are more urgent than others.

**What it constrains:**
- You're coupled to Redis for job persistence. If you later need cross-service messaging, you'd add a message broker alongside, not instead of.
- Worker process needs access to the same codebase and dependencies as the API server.

**Reversibility:** Medium. The queue abstraction is relatively contained. The main cost of changing is rewriting worker/job definitions, not touching the core order logic (which just enqueues a job).

### Option B: PostgreSQL-backed job queue (homebrew or pgboss)

Use PostgreSQL — which you already have — as the job store, either with a library like [pgboss](https://github.com/timgit/pg-boss) or a lightweight custom implementation using a `jobs` table with `SELECT ... FOR UPDATE SKIP LOCKED`.

**What it looks like concretely:**

- Add `pg-boss` as a dependency (or create a `jobs` table and a small polling worker).
- `createOrder` inserts the order and enqueues a job in the same database transaction — guaranteeing that if the order exists, the job exists.
- A worker polls the jobs table and processes side effects.

**Trade-offs:**

- *Transactional enqueue.* The biggest advantage: you can insert the order and enqueue the job in a single Postgres transaction. If the transaction fails, neither the order nor the job exists. With Redis-backed queues, there's a tiny window where the order is committed but the job isn't enqueued (process crash between the two operations).
- *No new infrastructure.* Postgres is already your database. No Redis dependency for job processing (Redis remains session-only).
- *Polling-based.* Postgres doesn't push — workers poll. This adds a small latency floor (typically 100-500ms depending on poll interval) and puts continuous load on the database. At low volume this is fine. At high volume, the polling queries compete with your application queries.
- *Less feature-rich than BullMQ.* pgboss covers the basics (retries, scheduling, concurrency), but BullMQ has more mature rate limiting, priority queues, job dependencies, and flow control.
- *Simpler operational model.* If your team already knows Postgres well, there's no new technology to learn. Failed jobs are just rows in a table you can query with SQL.

**What it enables:**
- Transactional consistency between order creation and job enqueue — no "lost jobs" failure mode.
- Leverages existing Postgres expertise and tooling for monitoring.

**What it constrains:**
- Postgres-backed queues don't scale as well as Redis-backed ones for high-throughput job processing. If job volume grows significantly, you'd eventually migrate to a dedicated queue.
- Poll-based latency means jobs start 100-500ms after enqueue (configurable but always non-zero). This is fine for email/PDF but worth noting.

**Reversibility:** Medium. Similar to Option A — the abstraction is contained. Migration to a different queue backend means rewriting the worker and enqueue logic, not the business logic.

### Option C: Simple in-process async (fire and forget)

Don't introduce a job queue at all. Just move the side effects to `Promise.all` with `catch` handlers and don't `await` the result.

**What it looks like concretely:**

```typescript
// Don't await — fire and forget
Promise.all([
  emailService.sendOrderConfirmation(order).catch(err => log.error('email failed', err)),
  this.generateInvoicePdf(order).catch(err => log.error('pdf failed', err)),
  this.updateInventory(order).catch(err => log.error('inventory failed', err)),
  this.notifyWarehouse(order).catch(err => log.error('warehouse failed', err)),
]);

return order;
```

**Trade-offs:**

- *Zero new dependencies.* No new libraries, no worker process, no infrastructure changes.
- *Immediate.* Side effects start processing instantly, in the same process. No serialization/deserialization overhead.
- *No retries.* If an operation fails, it's gone. You'd need to build retry logic manually, and it would be in-process (eating up API server resources).
- *No persistence.* If the process crashes or restarts while side effects are running, those jobs are lost. No way to recover them.
- *No visibility.* No dashboard, no job status, no way to inspect what failed or replay it.
- *Doesn't scale independently.* Side effects consume the same CPU and memory as your API requests. Under load, background work competes with serving responses.

**What it enables:**
- Solves the immediate latency problem with near-zero effort.
- Can serve as a stepping stone — get the quick win now, add a proper queue later.

**What it constrains:**
- No reliability guarantees. If inventory updates are important, lost updates create silent data drift.
- No operational visibility into failures.
- Makes the "real" solution harder later because fire-and-forget patterns tend to proliferate once introduced.

**Reversibility:** High. This is trivially replaceable with a proper queue later. But the risk is that "later" never comes and you accumulate more fire-and-forget patterns.

---

## 5. Recommendation

**I'd recommend Option A: BullMQ with existing Redis**, given what I know about this codebase.

### Reasoning

1. **Redis is already there.** This is the decisive factor. If Redis weren't already in the stack, the calculus would be different — I'd lean toward Option B (pgboss) to avoid introducing new infrastructure. But Redis is deployed, configured, and in the dependency tree. BullMQ just uses it for a new purpose.

2. **The right level of reliability.** Option C (fire-and-forget) is tempting as a quick win, but the inventory update's failure mode concerns me. Silent inventory drift is the kind of bug that's invisible for weeks and painful to fix. A proper queue with retries and failure visibility is worth the added complexity for that task alone.

3. **The operational cost is modest.** BullMQ needs a worker process. That's one more thing to deploy and monitor. But it's the same codebase, same language, same dependencies. The incremental complexity is small compared to, say, introducing a separate service or a managed message broker.

4. **It sets up a good pattern.** The email service already has `sendShippingNotification` and `sendRefundConfirmation`. These will almost certainly need background processing too. BullMQ gives you a pattern that extends naturally to those cases.

### Assumptions this depends on

- **If Redis availability is a concern** (e.g., it's a single instance with no replication and losing jobs is unacceptable), Option B (pgboss) becomes better because Postgres likely has better durability guarantees in your setup.
- **If the team has no capacity for running a worker process** (e.g., serverless deployment where you can't run long-lived processes), the approach changes fundamentally — you'd look at a managed queue service (SQS, Cloud Tasks) or Option C as a stopgap.
- **If order volume is very low** (single-digit orders per day) and the team is very small, Option C is defensible as a pragmatic choice. The reliability risk is real but low-probability at low volume.

### What I'd want to validate before committing

- Confirm Redis is running with persistence enabled (RDB or AOF). Without persistence, Redis restarts lose all queued jobs. If persistence isn't on, either enable it or favor Option B.
- Confirm the deployment model supports running a separate worker process alongside the API server.
- Get a clear answer on inventory update criticality — if inventory drift is acceptable (e.g., there's a nightly reconciliation), Option C becomes more viable.

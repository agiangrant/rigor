# Background Processing for Order Creation

## Problem

`OrderService.createOrder` blocks the API response for 2-3 seconds while performing four post-order tasks synchronously:

| Task | Latency | Failure impact |
|------|---------|----------------|
| Send confirmation email (SMTP) | ~500ms | Non-critical — can retry later |
| Generate invoice PDF (external service) | ~800ms | Non-critical — can generate on demand |
| Update inventory counts | ~200ms | Important but eventually-consistent is acceptable |
| Notify warehouse (webhook) | ~500ms | Important but retriable |

None of these tasks need to complete before the user sees their order confirmation. The order row is already persisted to Postgres before any of them run.

## Existing Stack Context

- **Runtime:** Node.js / TypeScript (Express)
- **Database:** PostgreSQL (via `pg` pool)
- **Redis:** Already deployed, currently used only for session storage
- **Email:** nodemailer (SMTP)
- **Tests:** vitest

Redis is the critical detail here. It's already in the infrastructure and the dependency graph.

## Options

### Option A: BullMQ (Redis-backed job queue)

Use BullMQ to enqueue each post-order task as a separate job. A worker process (or workers within the same process during early stages) picks jobs off the queue and executes them.

**How it works:**
- `createOrder` inserts the order row, enqueues 4 jobs, returns immediately.
- A worker (same process or separate) processes jobs from the queue.
- BullMQ handles retries, backoff, and dead-letter semantics out of the box.

**Pros:**
- Uses your existing Redis — no new infrastructure to deploy or pay for.
- Mature library, well-maintained, purpose-built for Node.js.
- Built-in retry with exponential backoff, rate limiting, job prioritization, delayed jobs.
- Dashboard available (Bull Board) for observability.
- Jobs survive process restarts (persisted in Redis).
- Can run workers in-process initially, split to dedicated workers later — scales incrementally.
- Each task type gets its own queue, so failures are isolated (a failing PDF service doesn't block warehouse notifications).

**Cons:**
- Adds a runtime dependency (bullmq npm package).
- Redis becomes a critical dependency (it already is for sessions, but queue loss is higher impact than session loss).
- No exactly-once delivery guarantee — jobs are at-least-once, so handlers should be idempotent.
- If you outgrow a single Redis instance, you need Redis Cluster or a managed service.

**Effort:** Low. A few hours to wire up queues and move the four calls into job handlers.

### Option B: PostgreSQL-based job queue (pgboss or custom)

Use Postgres itself as the job store via a library like `pgboss`, or roll a simple `jobs` table with polling.

**How it works:**
- `createOrder` inserts the order and the job rows in a single transaction (transactional outbox pattern).
- A poller or LISTEN/NOTIFY mechanism picks up jobs.

**Pros:**
- No new infrastructure — Postgres is already there.
- Transactional enqueueing: order creation and job insertion are atomic, so you can never have an order without its jobs (or vice versa).
- Simpler operational model if Redis going down is a concern.

**Cons:**
- Polling-based queues add load to your database and have higher latency than Redis pub/sub.
- pgboss is less actively maintained and less feature-rich than BullMQ.
- Postgres is not designed to be a message broker — under high job throughput, the jobs table becomes a hotspot (row locks, vacuuming pressure, index bloat).
- Rolling your own queue is a trap — it always starts simple and accumulates complexity (retries, dead letters, concurrency control, visibility timeouts).
- You already have Redis. Using Postgres as a queue when Redis is available is solving a problem you don't have.

**Effort:** Low-medium. pgboss is straightforward, but a custom solution is deceptively complex.

### Option C: External message broker (SQS, RabbitMQ, Kafka)

Deploy a dedicated message broker.

**Pros:**
- Purpose-built for messaging at scale.
- Strong durability guarantees (SQS, Kafka).
- Decouples producers and consumers cleanly.

**Cons:**
- New infrastructure to deploy, configure, monitor, and pay for.
- Operational complexity is dramatically higher than BullMQ + existing Redis.
- Your throughput doesn't justify it — you're processing orders, not millions of events per second.
- Kafka in particular is wildly over-engineered for this use case.
- SQS is reasonable if you're on AWS, but still adds a new service dependency and AWS SDK to the codebase.

**Effort:** Medium-high. Infrastructure provisioning, new SDK, new failure modes to handle.

### Option D: Fire-and-forget with `Promise.all` (no queue)

Just don't `await` the post-order tasks. Let them run as detached promises.

**Pros:**
- Zero new dependencies. Zero infrastructure changes.
- Trivially fast to implement — literally remove `await`.

**Cons:**
- No retries. If the PDF service is down, that invoice is gone.
- No visibility. You have no idea which jobs failed.
- Unhandled promise rejections can crash the process or silently swallow errors.
- No backpressure — under load, you'll spawn unbounded concurrent work.
- This is not background processing; it's ignoring errors. It will bite you.

**Effort:** Trivial, but you'll pay for it later.

## Recommendation: Option A — BullMQ

**BullMQ is the clear choice.** Here's why:

1. **You already have Redis.** The biggest objection to BullMQ — needing Redis — doesn't apply. It's deployed and connected. You'd be underusing infrastructure you're already paying for.

2. **It solves the actual problem.** The checkout becomes fast (order insert + enqueue = ~50ms), and all four tasks process reliably in the background with retries.

3. **It's the right size.** An external broker (SQS, Kafka, RabbitMQ) is over-engineered for four job types on an order platform. A Postgres queue is under-engineered when you already have Redis. BullMQ sits exactly in the sweet spot.

4. **Incremental scaling path.** Start with workers in-process. When you need to, move workers to a separate process or container. When you need more throughput, add more workers. No architectural changes required at any step.

5. **Operational maturity.** BullMQ has retry with exponential backoff, job-level TTL, rate limiting, named queues, job events, and a dashboard. You'd eventually need all of these — no point building them yourself.

The Postgres transactional outbox (Option B) deserves a mention: if you had strict requirements around "never lose a job even if Redis blips between order insert and enqueue," you could combine approaches — insert a job row transactionally with the order, then have a relay process move jobs from Postgres into BullMQ. But for email confirmations and warehouse webhooks, BullMQ's at-least-once delivery with retries is more than sufficient. The added complexity of a transactional outbox isn't warranted here.

## Key Implementation Notes (not code, just guidance)

- **One queue per task type** (email, pdf, inventory, warehouse) — isolates failures and lets you tune retry/concurrency per task.
- **Make handlers idempotent** — BullMQ is at-least-once, so a warehouse notification handler should tolerate being called twice for the same order.
- **Start workers in-process** — no need for a separate worker service on day one. Extract later when you have a reason to.
- **Add Bull Board** for visibility into queue depth, failed jobs, and retry status.
- **Set reasonable retry policies** — email and warehouse webhooks should retry with backoff (e.g., 3 attempts, exponential). PDF generation failures might want a longer retry window since the external service could be down for minutes.

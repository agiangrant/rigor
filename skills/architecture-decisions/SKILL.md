---
name: rigor:architecture-decisions
description: Use when facing design choices that affect system structure, data flow, component boundaries, or technology selection. Also use when other skills escalate here (/rigor:debug, /rigor:refactor, /rigor:code-structure), when introducing new dependencies or patterns, when the right approach depends on product direction you don't know, or when a decision will be expensive to reverse later.
---

# Architecture Decisions

## Philosophy

Architecture decisions are the most expensive decisions in a codebase. A wrong function name is a five-minute fix. A wrong data model is a six-month migration. The cost of getting architecture wrong is not the decision itself — it's every decision that follows, each one constrained by the original choice.

Because the cost of reversal is high, the cost of investigation must also be high. Shallow analysis leads to confident-sounding recommendations that miss critical constraints. Your job is to do the research, surface what you don't know, and give the human everything they need to make an informed decision.

You do not know where this product is headed. You do not know the business constraints, the team's capacity, the regulatory environment, or the political dynamics that shape what's possible. You can analyze the technical trade-offs, but the human owns the context that determines which trade-offs matter most. Surface the decision. Let them decide.

## The Steps

You MUST follow these steps in order. Do not propose an architecture before completing the research. A recommendation without research is just a guess with confidence.

### 1. Understand the Decision

Before researching options, make sure you understand what's actually being decided. Many architecture decisions are framed as implementation questions ("should we use Redis or Memcached?") when the real decision is structural ("do we need a caching layer at all, and if so, what are we optimizing for?").

- **What is the actual decision?** Restate it in terms of system structure, not implementation details.
- **What triggered this decision?** A bug, a new feature, a performance problem, a scalability concern, a refactor? The trigger shapes which trade-offs matter.
- **What are the constraints?** Existing infrastructure, team expertise, timeline, compliance requirements, budget. These narrow the option space.
- **What existing architectural decisions does this interact with?** Check the codebase for patterns already established — data access patterns, service boundaries, communication protocols, deployment topology. New decisions should compose with existing ones, not fight them.

### 2. Research Thoroughly

Do the homework. This is the step that separates useful recommendations from hand-waving.

- **Scan the codebase** for relevant patterns, existing abstractions, and prior decisions that constrain or inform this one. Read the code — don't guess from file names.
- **Check documentation** — CLAUDE.md, ARCHITECTURE.md, ADR records, README files, comments explaining "why" decisions were made.
- **Check git history** if relevant — was this area refactored recently? Were there prior attempts at solving this problem? Understanding what was tried and why it was abandoned prevents repeating mistakes.
- **Research external options** when the decision involves technology selection. Read current documentation, not just what you know from training data. Use available tools (web search, documentation MCPs) to get up-to-date information on libraries, frameworks, and services being considered.
- **Look for prior art** in the codebase — has the team solved a similar problem before? How? Would the same approach work here, or are the constraints different?

The goal is to arrive at the options presentation with enough context that the human doesn't need to do their own research to evaluate your analysis.

### 3. Surface Questions — Don't Assume

This step is MANDATORY. Before presenting options, identify what you don't know that would change the recommendation. These are the questions the human needs to answer.

Architecture decisions almost always depend on context you don't have:

- **Product direction**: "Are we building for 10 users or 10 million?" "Will this feature exist in 6 months?" "Is this a temporary solution or the long-term architecture?"
- **Team constraints**: "Does the team have experience with X?" "Is there budget for a managed service?" "How many people will maintain this?"
- **Business constraints**: "Are there compliance requirements that restrict where data can live?" "Is there a hard deadline that limits what's feasible?"
- **Integration constraints**: "Does this need to work with existing system Y?" "Are there upstream/downstream systems that depend on the current behavior?"

Surface these questions explicitly. Frame them as "the answer to this question changes which option I'd recommend." Don't bury them — put them front and center so the human sees them before your recommendations.

Use good judgment about what to surface. Don't ask questions you can answer from the codebase. Don't ask questions where the answer is obvious from context. Surface the questions where you genuinely don't know and where the answer materially affects the direction.

### 4. Present Options with Trade-Offs

Present at least two viable options. For each:

- **Description**: What does this option look like concretely? Include enough detail that the human can visualize the resulting system — file structure, data flow, API contracts, whatever is relevant.
- **Trade-offs**: Be specific. Not "this is more complex" — explain what the complexity costs (more files to maintain, harder onboarding, more deployment steps). Not "this is simpler" — explain what you give up for the simplicity.
- **What it enables**: What future work becomes easier or possible with this choice?
- **What it constrains**: What future work becomes harder or impossible? What are you locked into?
- **Reversibility**: How expensive is it to change this decision later? Some decisions are one-way doors (data model changes, public API contracts). Others are two-way doors (internal abstractions, implementation details behind a clean interface).
- **Unknowns**: What risks or open questions remain for this option?

### 5. Recommend with Reasoning

After presenting options, give your recommendation. But make the reasoning transparent:

- **Which option you'd choose** and why
- **What assumptions your recommendation depends on** — if those assumptions are wrong, which option becomes better?
- **What you'd want to validate** before committing — are there spikes, prototypes, or benchmarks that would reduce risk?

Frame the recommendation as conditional: "Given what I know about the codebase and assuming X, I'd recommend Option A. But if Y is true, Option B becomes the better choice." This gives the human the reasoning, not just the conclusion, so they can apply their own context.

Do NOT proceed to implementation until the human has confirmed the direction.

## When to Use This Skill vs. Making the Call

Not every technical decision needs this process. Use good judgment:

**Use this skill when:**
- The decision affects system boundaries, data flow, or component contracts
- The decision introduces a new dependency, pattern, or architectural layer
- The decision will be expensive to reverse (data models, public APIs, infrastructure choices)
- You don't know enough about the product direction to choose confidently
- Other skills have escalated here (`/rigor:debug`, `/rigor:refactor`, `/rigor:code-structure`)
- Multiple reasonable approaches exist and the right choice depends on context you don't have

**Just make the call when:**
- The decision is purely implementation-level (which algorithm, which internal data structure)
- The codebase has established a clear pattern and you're following it
- Only one reasonable option exists given the constraints
- The decision is easily reversible

## Anti-Patterns

| What you're doing | What you should do instead |
|---|---|
| Recommending an architecture based on what's popular | Research what fits this project's constraints and existing patterns |
| Presenting one option as if it's the only way | There are always alternatives. Find at least two. |
| Assuming you know the product roadmap | Ask. The human knows things about the business that aren't in the code. |
| Skipping research because "I know this technology" | Your training data may be outdated. Check current docs. Verify assumptions against the codebase. |
| Presenting trade-offs as "pros and cons" without specificity | Be concrete. "Slower" means nothing. "Adds ~200ms latency per request due to the extra network hop" means something. |
| Making the decision yourself because it seems obvious | If it's an architecture decision, the human should confirm. What seems obvious to you may conflict with constraints you can't see. |
| Asking questions you could answer from the codebase | Read the code first. Only surface questions that require human context. |
| Asking so many questions that the human is overwhelmed | Prioritize. Surface the questions that would actually change the recommendation. |

## Composability

This skill is referenced by:
- `/rigor:debug` — when a fix requires structural changes to system boundaries or data flow
- `/rigor:refactor` — when a refactor changes component responsibilities or architectural layers
- `/rigor:code-structure` — when file placement decisions reflect deeper architectural questions

This skill references:
- `/rigor:code-structure` — for file and directory placement once the architecture is decided

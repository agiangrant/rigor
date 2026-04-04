---
name: rigor:code-structure
description: Use when creating new files, adding directories, introducing new modules or subsystems, or placing code in a location for the first time. Also use when a writer skill needs to decide where new code should live. Triggers any time the task involves adding files to the repository, not just reorganizing existing ones.
---

# Code Structure

## Philosophy

A codebase's directory structure is its table of contents. When structure is consistent, developers find what they need without thinking. When it's inconsistent, every new file becomes a guessing game and every module boundary becomes a debate.

Your job is not to decide the structure. Your job is to **understand the existing structure** and either follow it or surface the decision when following it isn't clear. The human owns the architecture. You maintain its order.

## The Steps

You MUST follow these steps in order. Do not create files before completing the analysis. The fastest way to create structural debt is to "just put it somewhere" and clean up later — that cleanup rarely happens.

### 1. Scan the Existing Structure

Before proposing where new code should live, understand what already exists. This is non-negotiable — you cannot make a good placement decision without knowing the current layout.

- List the top-level directory structure
- Identify the organizational pattern in use (by feature, by layer, by domain, hybrid)
- Note naming conventions (singular vs plural, kebab-case vs camelCase, etc.)
- Check for any structure documentation (README files, CLAUDE.md, ARCHITECTURE.md, or similar)
- Look at recent files in the area you're working in to see how neighbors are organized

The goal is to answer: **what are the rules this project already follows?**

### 2. Classify the Change

Determine what kind of structural decision you're facing:

**Adding to an established location** — The project already has a clear place for this kind of code (e.g., adding a new API route to `src/routes/`, adding a new component to `src/components/`). The conventions are obvious. Go to step 3.

**Extending an existing pattern to a new area** — The project has the pattern but you're applying it somewhere it hasn't been applied yet (e.g., the project has `src/services/` with several services, and you're adding a new one that doesn't fit neatly into the existing categories). Proceed to step 4.

**Creating something genuinely new** — The change introduces a new module, subsystem, directory, or architectural layer that doesn't have precedent in the codebase. This MUST go to step 4.

### 3. Follow the Established Structure

When the project has a clear, established place for the code:

- Follow existing naming conventions exactly (if the project uses `userService.ts`, don't create `order-service.ts`)
- Match the file organization pattern of neighboring files (if similar files have a specific internal structure, follow it)
- Respect module boundaries — don't reach across boundaries that the existing structure implies
- If there's an index file or barrel export, update it

This is the simple case. Follow the pattern, create the files, move on. No need to surface options for decisions the project has already made.

### 4. Surface the Decision — NEVER Guess

This step is MANDATORY when the placement isn't obvious. Do not guess. Do not pick what "feels right." The human needs to see the options.

When you're not certain where new code belongs, present:

- **What you're adding**: Describe the new code's responsibility and its relationships to existing code
- **The options**: At least two viable placements, each with a concrete file path
- **Why each option makes sense**: What structural principle or existing pattern supports it
- **Trade-offs**: How each option affects discoverability, imports, module boundaries, and future growth
- **Your recommendation**: Which option you'd choose and why — but the human decides

Common decisions that require surfacing:
- Creating a new top-level directory
- Breaking an existing module into sub-modules
- Adding code that could belong to multiple existing modules
- Introducing a new architectural layer (e.g., adding a `middleware/` directory for the first time)
- Choosing between co-locating code with its consumers vs. centralizing it

Do NOT create files in new locations until the human has confirmed the approach.

### 5. Create with Consistency

Once the placement is decided (either by following existing structure in step 3 or by human decision in step 4):

- Create files and directories that match the project's existing conventions
- If creating a new directory, ensure it follows the same organizational pattern as sibling directories
- Update any barrel files, index files, or module registries that the project uses
- If the project has test file conventions (co-located vs. separate `__tests__/` directories), follow them

## Signals You're About to Make a Mess

If you catch yourself doing any of these, STOP and go back to step 2.

| What you're doing | What you should do instead |
|---|---|
| Creating a `utils/` or `helpers/` file as a catch-all | Find the module that owns this logic, or surface the decision |
| Putting a file at the project root because you're unsure where it goes | Scan the structure and find or propose the right home |
| Using a different naming convention than the rest of the project | Match what exists, even if you'd prefer something different |
| Creating a new directory without checking if an existing one serves the purpose | Scan for existing directories that might already cover this concern |
| Nesting deeper than the project's established depth | Follow the project's nesting patterns — if it's flat, stay flat |
| Adding code that imports from many distant modules | This may signal the code is in the wrong place — reconsider placement |
| Creating a one-off structure "just for this feature" | Consistency matters more than local optimization |

## Composability

This skill is a base layer. Language-specific writer skills (`/rigor:ts-writer`, `/rigor:go-writer`, `/rigor:py-writer`, `/rigor:rs-writer`) should invoke this skill's steps when creating new files. The writer handles *what* goes in the file. This skill handles *where* it goes.

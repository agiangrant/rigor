# Architecture Decision: Permission System Redesign

## Step 1: Understanding the Decision

### What is the actual decision?

How should we model authorization data and enforce access control in a system that currently has a flat two-role model (admin/member) scoped to a single organization, given that customers need both resource-level scoping (e.g., project-level access) and action-level granularity (e.g., "can edit but not delete")?

This is a **data model decision** — it determines how permissions are stored, queried, and enforced. It affects every authorization check in the system and every future feature that touches access control. It is expensive to reverse.

### What triggered this decision?

Customer requests for two distinct capabilities:
1. **Resource-scoped access** — restricting what a user can see/touch within an org (e.g., project-level)
2. **Action-level granularity** — restricting what a user can do to resources they can access (e.g., read but not write)

### What are the constraints?

Based on the codebase:

- **Existing data model is minimal.** `User` has a single `role` field (`admin` | `member`) and a single `organizationId`. There is no concept of projects, teams, or resource groupings.
- **Organization has a `plan` field** (`free`, `pro`, `enterprise`). This suggests tiered functionality — granular permissions might be gated by plan.
- **Resources exist but have no model definition.** The DB stub references `db.resources.findById` and the permission service checks `resource.organizationId`, so resources belong to an org. But there's no `Resource` interface — we don't know what resource types exist or what hierarchy they have.
- **The permission service is synchronous in logic, async in I/O.** Every check does two DB lookups (user + resource). This pattern will get more expensive with more granular checks unless we change the approach.
- **No caching layer.** Every permission check hits the DB. This matters because granular permissions means more frequent and more complex checks.
- **No existing RBAC/ABAC infrastructure.** No permission tables, no policy engine, no role-permission mappings. Whatever we build is greenfield.

### What existing decisions does this interact with?

- **Org-scoped tenancy.** Users belong to exactly one org. Resources belong to exactly one org. All permission checks gate on `user.organizationId === resource.organizationId`. Any new model must preserve this boundary.
- **Binary role model.** The `role` field on `User` is a simple union type. Callers likely check `user.role === 'admin'` directly in places beyond the permission service (this is a common pattern with simple role models — the "service" exists but isn't the only enforcement point).
- **Resource identity.** Resources are referenced by a flat `resourceId` with no type discrimination. The permission service doesn't know *what kind* of resource it's checking — it treats all resources identically.

## Step 2: Research Findings

### Current permission model

The system implements the simplest possible RBAC:

| Role | Read | Write | Delete |
|------|------|-------|--------|
| admin | Same-org resources | Same-org resources | Same-org resources |
| member | Same-org resources | No | No |

There is no:
- Per-resource permission assignment
- Grouping of resources (projects, folders, workspaces)
- Custom roles
- Permission inheritance
- Audit logging of permission checks

### Patterns in the codebase

- The `PermissionService` class is the centralization point but has a very thin interface: `canRead`, `canWrite`, `canDelete` — each taking `(userId, resourceId)`.
- `canDelete` delegates to `canWrite`, suggesting these were originally conceived as one level and may diverge.
- The DB layer is a stub (`null as any`), meaning the persistence layer hasn't been built yet or is abstracted elsewhere. This is relevant because it means we have more freedom in the data model than we would with an established schema.

### What's missing from the codebase

- No `Resource` model/interface. We don't know what resource types exist.
- No concept of "project" or any resource hierarchy.
- No indication of how many resources per org, how many users per org, or what the access patterns look like.
- No tests for the permission service.

## Step 3: Questions for the Human

These questions would change which option I'd recommend. They are ordered by impact.

### Must-answer before choosing a direction

1. **What resource types exist, and is there a natural hierarchy?** If resources already group into "projects" (or could), that's a natural scope boundary. If resources are flat, introducing a hierarchy is a bigger change. The answer determines whether we model scoping as "project membership" or as per-resource grants.

2. **How many users per organization, and how many resources per org?** If orgs are small (5-20 users, hundreds of resources), a simpler model works. If orgs are large (hundreds of users, thousands of resources), we need a model that doesn't require per-user-per-resource grants — that means roles or groups scoped to containers (projects/folders).

3. **Is granular permissions a feature for all plans, or enterprise-only?** If enterprise-only, we need the data model to support it but the enforcement can be layered — free/pro orgs continue with the simple model, enterprise orgs get the full system. This affects how much complexity hits the common path.

4. **Are there existing API consumers or integrations that check `user.role` directly?** If the `admin`/`member` role field is checked outside the permission service (in middleware, in API handlers, in frontend code), migration scope is larger. We need to know how deeply embedded the current model is.

### Important but can be answered during design

5. **Do customers need to define custom roles, or is a fixed set of roles sufficient?** "Editor", "Viewer", "Admin" per project is much simpler than "customers define their own roles with custom permission sets." The latter requires a role-permission mapping table and a management UI.

6. **Do you need permission inheritance?** For example: org admin automatically has admin on all projects, project admin has write on all resources in the project. Inheritance simplifies UX but complicates the resolution logic.

7. **Is there a need for deny rules, or is the model purely additive?** Additive-only (you have permission if any grant says yes) is simpler. Deny rules (explicit "no access" overrides) add complexity to resolution but are sometimes needed for compliance.

## Step 4: Options

### Option A: Scoped Role-Based Access Control (Scoped RBAC)

Introduce the concept of a **scope** (project, workspace, or similar container) and assign roles at the scope level rather than the org level.

**Data model sketch:**

```
Project { id, organizationId, name }

Membership { userId, scopeType, scopeId, role }
  — scopeType: 'organization' | 'project'
  — scopeId: the org or project ID
  — role: 'admin' | 'editor' | 'viewer'

Resource { id, projectId, organizationId, type }
```

**How permission checks work:**

1. Resolve the resource's project (and org).
2. Look up the user's membership for that project. Fall back to org-level membership.
3. Check if the role grants the requested action.

A fixed role-to-action mapping defines what each role can do:

```
admin  -> read, write, delete, manage_members
editor -> read, write
viewer -> read
```

**Trade-offs:**

- **Complexity: Moderate.** Adds one new entity (Project/scope), one new table (Membership), and a role-action mapping (can be a simple lookup table or even a constant). The permission service grows but stays conceptually simple.
- **Migration: Moderate.** Existing `user.role` must become a Membership record at the org scope. Existing resources must get a `projectId` (or a default project per org for migration).
- **Query cost:** Permission checks now require a membership lookup by `(userId, scopeType, scopeId)` instead of reading the user's role field. With an index on that compound key, this is a single indexed query. If inheritance is enabled (org admin implies project admin), it's two queries worst case.
- **UX:** Straightforward for users to understand — "you're an editor on Project X" maps to familiar mental models (GitHub, Notion, Linear all work this way).

**What it enables:**
- Project-level access control (the primary customer request).
- Action-level granularity via the role-action mapping (the secondary request).
- Adding new roles later without schema changes (just update the mapping).
- Plan-gating: free/pro orgs get one default project with org-level roles (behaves like today). Enterprise orgs get multiple projects with scoped roles.

**What it constrains:**
- Role granularity is fixed to whatever roles you define. If a customer wants "can write but not delete," they need a role that matches that. You can't mix and match individual actions per user without adding more roles.
- Adding new scope types (e.g., folder within project) requires extending the membership model.

**Reversibility:** Medium-hard. The Membership table and Project entity become load-bearing quickly. Migrating away means re-flattening permissions.

**Unknowns:** Whether the fixed role set will be granular enough for all customers. Some enterprise customers may push for custom roles.

---

### Option B: Attribute-Based / Fine-Grained Permission Grants

Instead of roles, assign individual permissions directly. Each grant specifies who can do what to which resource (or resource scope).

**Data model sketch:**

```
PermissionGrant {
  id,
  userId,          // or groupId for group-based grants
  action,          // 'read' | 'write' | 'delete' | 'manage_members' | ...
  resourceType,    // 'project' | 'document' | 'organization' | '*'
  resourceId,      // specific resource, or null for "all of this type in scope"
  scopeId,         // org or project this grant lives within
}
```

**How permission checks work:**

1. Query for any grant matching `(userId, action, resourceType, resourceId)` or a wildcard grant covering it.
2. If a matching grant exists, allow.

**Trade-offs:**

- **Complexity: High.** The grant model is flexible but requires careful query design. Wildcard resolution (does the user have a grant for "all documents in project X"?) requires ordered evaluation. The management UI must expose this without overwhelming users.
- **Migration: Moderate-High.** Existing admin users get grants for `('*', '*', orgScope)`. Existing members get grants for `('read', '*', orgScope)`. But the enforcement layer changes completely.
- **Query cost: Higher.** Each permission check may need to evaluate multiple potential grants (specific resource, resource type wildcard, scope wildcard). This can be mitigated with caching or a denormalized "effective permissions" table, but that's additional infrastructure.
- **UX: Harder to reason about.** "You have 47 permission grants" is harder to understand than "you're an editor on Project X." Debugging "why can't I do X?" becomes non-trivial.

**What it enables:**
- Maximum granularity — any user can have any combination of actions on any resource.
- No need to predefine roles (though you can layer "role templates" on top as convenience).
- Per-resource grants without needing a container (project) hierarchy.
- Conditional permissions could be added later (time-based, IP-based) by extending the grant model.

**What it constrains:**
- Performance requires caching or denormalization from day one — you can't afford N queries per action.
- Management UX must be built carefully to avoid confusion. You'll likely end up building "roles" as a UX convenience on top of the grant model anyway.
- Auditing and debugging permission issues becomes complex.

**Reversibility:** Hard. A grant-based model touches every permission check and builds up a potentially large grants table. Migrating to a simpler model means re-aggregating grants into roles.

**Unknowns:** Whether the flexibility is actually needed, or whether customers would be satisfied with a smaller set of well-chosen roles. In my experience, most teams that build fine-grained permissions end up layering roles on top because raw grants are too hard to manage.

---

### Option C: Scoped RBAC with Optional Custom Roles (Enterprise)

Same as Option A, but with an additional table that allows enterprise organizations to define custom roles with specific action sets.

**Data model sketch:**

```
Project { id, organizationId, name }

Role { id, organizationId, name, actions[] }
  — Built-in roles: admin, editor, viewer (orgId = null, immutable)
  — Custom roles: defined per org (enterprise only)

Membership { userId, scopeType, scopeId, roleId }

Resource { id, projectId, organizationId, type }
```

**How permission checks work:**

1. Resolve resource's project and org.
2. Look up user's membership for the scope.
3. Look up the role's action set.
4. Check if the requested action is in the set.

**Trade-offs:**

- **Complexity: Moderate-High.** Adds the custom role definition layer on top of Option A. The permission check adds one more lookup (role -> actions), but this is highly cacheable since role definitions change rarely.
- **Migration: Same as Option A** plus seeding the built-in role definitions.
- **Query cost:** One additional lookup vs. Option A (role -> actions), but role definitions are small and cache-friendly.
- **UX:** "You're a 'Reviewer' on Project X" — custom role names are meaningful to the org. Good UX if the role management interface is solid.

**What it enables:**
- Everything Option A enables.
- Enterprise customers can define roles matching their exact needs ("Reviewer: can read and comment but not edit").
- Role definitions are per-org, so each enterprise customer gets their own taxonomy.

**What it constrains:**
- You must build a role management UI/API for enterprise customers.
- Custom roles create a support surface area — "why can't I do X?" now requires looking up what actions the custom role includes.
- Role definitions can drift — an org might create 15 custom roles that overlap in confusing ways.

**Reversibility:** Same as Option A for the core model. The custom roles layer could be removed (migrating custom role members back to built-in roles) with moderate effort.

**Unknowns:** Whether any customers actually need custom roles at launch, or whether a well-chosen set of built-in roles (admin, editor, viewer, plus maybe one or two more) covers the real use cases.

## Step 5: Recommendation

**I recommend Option A (Scoped RBAC with fixed roles), with the data model designed to support Option C later.**

### Reasoning

1. **It solves both stated customer needs.** Project-level scoping gives resource-level access control. The role-action mapping gives action-level granularity. These are the two things customers asked for.

2. **It's the smallest model change that opens the most doors.** Adding Project + Membership is a well-understood pattern. The role-action mapping is a constant (or small config table) — no new infrastructure needed.

3. **It composes with the existing model.** Org-level admin/member can be represented as Membership records at the organization scope. The migration is mechanical: for each user, create a Membership `{ userId, scopeType: 'organization', scopeId: user.organizationId, role: user.role === 'admin' ? 'admin' : 'viewer' }`. The old `role` field on User can be deprecated gradually.

4. **It avoids premature complexity.** Option B (fine-grained grants) gives maximum flexibility but at the cost of query complexity, UX complexity, and management overhead. Most B2B SaaS products that ship fine-grained permissions eventually layer roles on top — you'd build Option A's UX anyway. Start with A and only move to B if concrete customer needs demand it.

5. **It's designed to evolve into Option C.** If you use a `roleId` foreign key in Membership instead of an inline role string, adding custom role definitions later is a non-breaking schema addition. You don't need to build custom roles now, but the door stays open.

### Assumptions this depends on

- **Resources can be grouped into projects (or an equivalent container).** If resources are truly flat with no natural grouping, Option A's project-scoped model is awkward. In that case, Option B's per-resource grants become more compelling.
- **A fixed set of 3-5 roles covers the majority of customer needs.** If early enterprise feedback shows every customer wants a different action set, Option C should be built sooner.
- **Org sizes are moderate** (not thousands of users with thousands of projects). At extreme scale, the membership table needs careful indexing and possibly caching, but the model itself still works.

### What I'd want to validate before committing

- **Survey the actual customer requests.** Do the "more granular permissions" requests cluster around a few patterns (e.g., "read-only collaborator," "can edit but not delete") or is each customer unique? If they cluster, fixed roles are clearly right. If each is unique, custom roles move up in priority.
- **Confirm resource hierarchy.** Talk to the team about whether resources naturally group. If there's no existing concept of "project," introducing one is a product decision, not just a data model change — it affects navigation, organization, and how users think about the product.
- **Prototype the permission check hot path.** The current service does 2 DB queries per check. The new model does 2-3. Benchmark this with realistic data to confirm it's acceptable, or plan for a caching layer.

---

**Do not proceed to implementation until confirming:**
1. The answers to the questions in Step 3 (especially questions 1-4).
2. Which option to pursue.
3. Whether to build the `roleId` foreign key approach from the start (enabling Option C later) or inline the role string (simpler but harder to extend).

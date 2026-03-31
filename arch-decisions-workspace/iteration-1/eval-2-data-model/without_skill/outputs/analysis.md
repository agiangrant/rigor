# Permission System Redesign: Analysis

## Current State

The existing permission model is a flat, two-role system at the organization level:

- **User** has a `role` field: `'admin' | 'member'`
- **User** belongs to exactly one **Organization** (via `organizationId`)
- **Resources** belong to an organization (implied by `resource.organizationId` in `PermissionService`)
- **Admins** can read, write, and delete any resource in their org
- **Members** can only read resources in their org
- There is no concept of projects, teams, or per-resource permissions

This is a binary system: you either have full control or read-only access, scoped entirely to the organization.

## What Customers Are Asking For

Two distinct requests:

1. **Project-level access control** -- not every member should see every resource in the org. Some resources belong to projects, and access should be scoped to project membership.
2. **Action-level restrictions** -- finer control than "read everything / write everything." For example, a member who can write but not delete, or who can manage project settings but not billing.

These are orthogonal axes: one is about **scope** (what you can see), the other is about **capability** (what you can do).

## Options

### Option A: Role-Per-Project (Scoped Roles)

Add a `Project` entity. Users get assigned roles per project rather than per organization. The org-level role becomes a default/fallback.

**Data model changes:**
- New `Project` entity (`id`, `organizationId`, `name`)
- Resources get a `projectId` field
- New `ProjectMembership` join entity (`userId`, `projectId`, `role`)
- Org-level `role` on `User` becomes the org-wide default (or is kept for org-level actions like billing)

**Permission check flow:**
1. Look up user's membership for the resource's project
2. If project membership exists, use that role
3. If not, fall back to org-level role (or deny access)

**Pros:**
- Conceptually simple -- roles are familiar, they're just scoped more narrowly now
- Easy for customers to understand and configure
- Covers the "project-level access" request directly
- Migrating existing data is straightforward (all current resources are in a default project, or have no project and use org-level fallback)

**Cons:**
- Doesn't fully solve "restrict specific actions" unless you add more roles beyond admin/member (e.g., `editor`, `viewer`, `manager`)
- Role proliferation risk -- every new capability customers want may pressure you to add another role
- Roles are coarse; if a customer wants "can edit but not delete in Project X," you need a role that exactly matches that bundle

### Option B: Granular Permissions (Capability-Based)

Replace roles with explicit permission grants. Each user gets a set of permissions, either directly or via permission groups.

**Data model changes:**
- Define a `Permission` enum: `resource:read`, `resource:write`, `resource:delete`, `project:manage`, `org:billing`, etc.
- New `PermissionGrant` entity (`userId`, `permission`, `scopeType`, `scopeId`) where scope can be org-level or project-level
- Remove `role` from `User` (or keep it as a display convenience)

**Permission check flow:**
1. For action X on resource Y, check if user has the matching permission at the resource's project scope or org scope
2. Org-scope grants apply to all projects unless overridden

**Pros:**
- Maximum flexibility -- covers both customer requests completely
- No role proliferation; new capabilities are just new permission strings
- Customers who want exact control get it

**Cons:**
- Significant complexity increase in the permission check path
- Hard to reason about -- "what can user X do?" requires scanning all grants
- UI/UX burden: configuring individual permissions is tedious for admins
- Migration is more involved (current roles must be expanded into individual permission grants)
- Over-engineering risk for most customers who just want simple project scoping

### Option C: Roles + Projects + Permission Overrides (Hybrid)

Keep roles as the primary mechanism, add project scoping, and allow per-role permission customization.

**Data model changes:**
- New `Project` entity
- Resources get a `projectId`
- New `ProjectMembership` (`userId`, `projectId`, `roleId`)
- New `Role` entity (`id`, `organizationId`, `name`, `permissions: string[]`) -- org-specific custom roles
- Default roles (`admin`, `editor`, `viewer`) are seeded per org, with standard permission sets
- Orgs on the Enterprise plan can create custom roles with arbitrary permission sets

**Permission check flow:**
1. Resolve user's role for the resource's project (fall back to org-level role)
2. Look up that role's permission set
3. Check if the required permission is in the set

**Pros:**
- Simple case stays simple -- most orgs use the default roles and never think about permissions
- Covers project scoping cleanly
- Enterprise customers who need granular control can create custom roles
- Aligns with the existing `plan` tiers on Organization (free/pro use defaults, enterprise gets customization)
- Roles remain the unit of assignment, so it's easy to audit "what can user X do?" (look up their role, look up its permissions)

**Cons:**
- More complex data model than Option A
- Custom roles need a management UI (but only for enterprise)
- Still indirection -- permission checks go through role resolution, which adds a lookup step

## Trade-off Summary

| Criterion | A: Scoped Roles | B: Granular Perms | C: Hybrid |
|---|---|---|---|
| Covers project-level access | Yes | Yes | Yes |
| Covers action-level restrictions | Partially (need more roles) | Fully | Fully (via custom roles) |
| Simplicity for typical customer | High | Low | High |
| Flexibility for power users | Low | High | High |
| Migration complexity | Low | High | Medium |
| Auditability ("what can X do?") | Easy | Hard | Easy |
| Aligns with existing plan tiers | Neutral | Neutral | Natural fit |
| Long-term extensibility | Limited | High | High |

## Recommendation: Option C (Hybrid)

Option C is the right design for this system. Here's why:

**It matches the actual customer segmentation.** The Organization model already has `plan: 'free' | 'pro' | 'enterprise'`. Most customers (free/pro) want simple project-level scoping with familiar roles. Enterprise customers want granular control. Option C serves both without forcing complexity on the simple case.

**Roles remain the primary abstraction.** Assigning a user to a project with a role is one operation. Understanding what a user can do is one lookup (user -> role -> permissions). This keeps the mental model manageable. Option B's "bag of permissions per user per scope" is powerful but creates an audit and comprehension nightmare.

**It's incrementally buildable.** You can ship this in phases:
1. Add `Project` and `ProjectMembership` with the existing `admin`/`member` roles. This alone covers the project-scoping request.
2. Add `editor` and `viewer` as built-in roles with distinct permission sets. This covers most action-restriction requests.
3. Add custom role creation for enterprise orgs. This covers the long tail.

Each phase is independently valuable and shippable. Option B requires the full permission infrastructure before any of it is useful.

**It avoids premature abstraction while keeping the door open.** Option A is too rigid -- you'll hit role proliferation within months. Option B is over-built for the current customer base. Option C gives you a clean extension path without paying the full cost upfront.

## Key Design Decisions to Resolve Before Implementation

These are decisions that would need further input before writing code:

1. **Inheritance model**: Should org-level roles propagate to all projects by default (opt-out), or should project access be explicit (opt-in)? Opt-out is friendlier for small orgs; opt-in is safer for large orgs with sensitive projects. This likely varies by plan tier.

2. **Resource without a project**: Can resources exist outside any project (org-level), or must everything belong to a project? A default/catch-all project per org simplifies the model but may feel awkward in the UI.

3. **Permission deny rules**: Should the system support only "allow" grants, or also explicit "deny"? Deny rules add power but make the resolution logic significantly harder to reason about. Recommendation: start with allow-only.

4. **Role hierarchy**: Should `admin` implicitly include all `editor` permissions, which include all `viewer` permissions? A strict hierarchy simplifies checks but may not model real-world needs (e.g., a "billing admin" who can't edit resources).

5. **Cross-project resources**: Can a resource belong to multiple projects? If so, the permission model needs to handle unions of grants. Recommendation: single project ownership, with a linking/sharing mechanism deferred to later.

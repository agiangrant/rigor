# Re-initialize Skills: Added Rust

## What changed

Added Rust writer routing (`/rs:writer`) to the Language Writers table in CLAUDE.md.

## Specific modification

- Added one row to the "Language Writers" routing table:
  - Trigger: "Writing or modifying Rust"
  - Skill: `/rs:writer`
  - When: "For ALL Rust implementation work."

## What was preserved

- All universal skill routing (unchanged)
- TypeScript writer routing (unchanged)
- Core rules section (unchanged)
- All project content below the routing block (unchanged)

## Why

The project now contains Rust code (`Cargo.toml`, `src/lib.rs`) alongside the existing TypeScript (`package.json`). The `rs:writer` skill route ensures Rust code gets the same skill-driven treatment as TypeScript.

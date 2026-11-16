# Design

## Context

See proposal.md for motivation and problem statement.
The system uses Xano for backend data storage, with schemas represented locally as XanoScript (`.xs`) files in the `tables/` directory. The authentication table `user` is already established.

## Goals / Non-Goals

**Goals:**
- Define the XanoScript schema for the `subjects` table with exact field types: `id` (auto/int), `created_at` (timestamp), `name` (text), `teacher` (text), `hours` (int), and `user_id` (int foreign key to `user`).
- Ensure indexes support efficient querying filtered by `user_id` to maintain multi-tenant security.

**Non-Goals:**
- CRUD API endpoints generation (out of scope for this change per task boundaries).
- Frontend UI components or FlutterFlow integration.
- Automated push or synchronization with Xano cloud (manual push is developer responsibility).

## Decisions

- **Table naming and casing**: Name the table `subjects` using `snake_case` in English, matching AGENTS.md conventions.
- **Foreign Key representation**: Model `user_id` as an integer reference to the `user` table. Add a secondary index on `user_id` to optimize tenant-scoped queries.
- **Audit timestamp**: Include `created_at?=now` standard Xano timestamp pattern to track record creation.

## Risks / Trade-offs

- **[Risk] Missing relation integrity if foreign keys aren't strictly enforced in draft mode** → Explicitly index `user_id` and document the relationship to `user`.

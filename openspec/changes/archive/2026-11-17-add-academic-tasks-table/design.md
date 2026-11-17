# Design

## Context

See proposal.md for motivation and context.
EduTrack AI's backend is defined with XanoScript schemas in the `tables/` directory. The `subjects` table (`tables/915681_subjects.xs`) and auth `user` table (`tables/915633_user.xs`) are already present in the schema.

## Goals / Non-Goals

**Goals:**
- Define the XanoScript schema for the `academic_tasks` table with fields `id`, `created_at`, `title`, `description`, `due_date`, `status` (default "pending"), `subject_id` (foreign key to `subjects`), and `user_id` (foreign key to `user`).
- Add indexes on `id`, `user_id`, `subject_id`, and `created_at` to ensure fast filtering and isolation.

**Non-Goals:**
- CRUD APIs or query endpoints (e.g., GET/POST/PATCH/DELETE endpoints are not requested and strictly out of scope).
- Frontend UI components or FlutterFlow configurations.
- Direct push or deploy to the remote Xano server.

## Decisions

- **Table schema & syntax**: Follow established XanoScript patterns and guidelines from AGENTS.md:
  - `int id` (primary key)
  - `timestamp created_at?=now { visibility = "private" }`
  - `text title? filters=trim`
  - `text description? filters=trim`
  - `timestamp due_date?`
  - `text status?="pending" { description = "Status" }`
  - `int subject_id? { table = "subjects" }`
  - `int user_id? { table = "user" }`
- **Data Isolation**: Enforce mandatory `user_id` relationship and index to support multi-tenant query security.

## Risks / Trade-offs

- **[Risk] Cascade behavior when a subject is deleted** → Addressed at application logic layer or Xano triggers when handling subject deletion.

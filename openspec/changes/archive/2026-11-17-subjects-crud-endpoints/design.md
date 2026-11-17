# Design

## Context

See proposal.md for motivation and context.
The table `subjects` exists in the local schema with `id`, `created_at`, `name`, `teacher`, `hours`, and `user_id` referencing the authenticated user table `user`. Per AGENTS.md, all database interactions must strictly enforce tenant isolation by filtering with `$auth.id`.

## Goals / Non-Goals

**Goals:**
- Create 5 RESTful endpoint definitions in XanoScript (`apis/subjects/`):
  - POST `/subjects`: Add a subject setting `user_id = $auth.id`.
  - GET `/subjects`: Query list of subjects where `user_id == $auth.id`.
  - GET `/subjects/{id}`: Query single subject record matching `id == $input.id` and `user_id == $auth.id`.
  - PATCH `/subjects/{id}`: Edit subject record matching `id == $input.id` and `user_id == $auth.id`.
  - DELETE `/subjects/{id}`: Delete subject record matching `id == $input.id` and `user_id == $auth.id`.
- Enforce `auth = "user"` on all endpoints.

**Non-Goals:**
- Schema changes in `tables/` (the existing table structure is preserved).
- Frontend UI components or FlutterFlow views.
- Direct push/sync/deploy to the remote Xano server.

## Decisions

- **API Group Structure**: Place endpoint definitions under `apis/subjects/` with `api_group = "Subjects"`.
- **Query Scoping & Isolation**:
  - In all queries, include `where = ... && ($db.subjects.user_id == $auth.id)` so unauthorized users cannot view, modify, or delete subjects belonging to other users.
  - On record creation, assign `user_id` directly from `$auth.id` instead of accepting `user_id` from client request body.

## Risks / Trade-offs

- **[Risk] Attempt to access another user's subject by guessing ID** → Mitigated by compound where filter `id == $input.id && user_id == $auth.id`, preventing data leakage and returning null / not found.

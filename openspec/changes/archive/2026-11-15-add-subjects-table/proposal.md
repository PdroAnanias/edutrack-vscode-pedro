# Proposal

## Why

In EduTrack AI, academic tracking requires organizing courses and disciplines taken by students. To manage academic subjects with proper user data isolation, the database schema requires a dedicated `subjects` table linked to authenticated users.

## What Changes

- Add database table `subjects` in Xano with fields:
  - `id` (int, auto-increment, primary key)
  - `created_at` (timestamp, defaults to now)
  - `name` (text, course/subject name)
  - `teacher` (text, instructor name)
  - `hours` (int, workload/credit hours)
  - `user_id` (int, foreign key reference to the authenticated `user` table)
- Enforce data isolation where all subject records belong to a specific authenticated user via `user_id`.

## Capabilities

### New Capabilities
- `subjects`: Manages subject definitions and academic course metadata scoped to authenticated users.

### Modified Capabilities
<!-- None -->

## Impact

- Database schema: creates the `subjects` table.
- Downstream endpoints and workflows can safely link future academic entities (e.g. grades, attendance, tasks) to `subjects` scoped by `user_id`.

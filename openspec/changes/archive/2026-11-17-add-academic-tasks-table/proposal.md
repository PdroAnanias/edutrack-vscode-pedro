# Proposal

## Why

Students need a structured way to register, organize, and manage academic commitments—such as homework, exams, and projects—associated with their enrolled disciplines. Introducing a dedicated `academic_tasks` table enables academic task tracking with student-level data isolation.

## What Changes

- Add database table `academic_tasks` in Xano with fields:
  - `id` (int, auto-increment, primary key)
  - `created_at` (timestamp, defaults to now)
  - `title` (text, task title)
  - `description` (text, task description)
  - `due_date` (date / timestamp, deadline for the task)
  - `status` (text, defaults to "pending")
  - `subject_id` (int, foreign key reference to `subjects` table)
  - `user_id` (int, foreign key reference to authenticated `user` table for data isolation)
- Add indexing on `id`, `user_id`, and `subject_id` to support tenant-safe querying.

## Capabilities

### New Capabilities
- `academic-tasks`: Management and persistence of student academic tasks associated with subjects.

### Modified Capabilities
<!-- None -->

## Impact

- Database schema: creates the `academic_tasks` table.
- Future endpoints and features can query and mutate tasks scoped by `user_id` and `subject_id`.

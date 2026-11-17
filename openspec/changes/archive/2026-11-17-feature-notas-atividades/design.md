# Design

## Context

See proposal.md for motivation and problem statement.
The application backend runs on Xano via XanoScript (.xs). Authentication and user scoping are handled via the `user` table and `user_id`.

## Goals / Non-Goals

**Goals:**
- Define the XanoScript schema for the `activity_grades` table with fields `id`, `created_at`, `academic_task_id`, `student_id`, `grade`, and `user_id` (FK to `user`).
- Create a POST `/activity_grades` endpoint in XanoScript to allow authenticated teachers to submit a grade.

**Non-Goals:**
- Consultation endpoints (e.g., GET `/academic_tasks/{id}/grades` or GET `/users/{id}/grades` are strictly out of scope per user request boundaries).
- Update/Delete endpoints or full CRUD operations (only grade submission via POST was requested).
- Frontend UI components or FlutterFlow integration.
- Direct push/sync to Xano backend server.

## Decisions

- **Table Schema**: Table `activity_grades` will store:
  - `id` (int, auto-increment)
  - `created_at` (timestamp?=now)
  - `academic_task_id` (int)
  - `student_id` (int)
  - `grade` (decimal)
  - `user_id` (int, references `user`)
  - Secondary indexes on `user_id`, `academic_task_id`, and `student_id`.
- **API Endpoint**: POST `/activity_grades` requires authentication (`auth = true`), receives `academic_task_id`, `student_id`, and `grade`, and saves the record with `user_id = $auth.id`.

## Risks / Trade-offs

- **[Risk] Duplicate grade entry for the same student and task** → Can be mitigated in future iterations via unique compound indexing if needed.

# Design

## Context

See proposal.md for motivation and context.
The application features `subjects` and `academic_tasks` tables. Students need to search their own subjects either by name or by the existence of overdue tasks.

## Goals / Non-Goals

**Goals:**
- Implement `scripts/filter_overdue_subjects.py` to evaluate task due dates (`due_date < current_time` and `status != "completed"`) and filter corresponding subjects, using structured error handling (`try/except`).
- Implement GET `/subjects/search` in `apis/subjects/subjects_search_GET.xs` supporting query parameters:
  - `name?` (text search)
  - `has_overdue?` (boolean flag)
- Enforce strict tenant isolation: only subjects and tasks matching `user_id == $auth.id` are queried.

**Non-Goals:**
- Schema changes in existing database tables.
- Frontend FlutterFlow UI implementation.
- Automated push or synchronization with remote Xano server.

## Decisions

- **Python Script**:
  - `scripts/filter_overdue_subjects.py` parses ISO / UNIX timestamp formats and evaluates task status.
  - Returns structured JSON containing matched subjects and execution status (`success` or `error`).
- **Xano Endpoint**:
  - GET `/subjects/search` uses `auth = "user"`.
  - Performs user-scoped queries on `subjects` and checks associated `academic_tasks` when `has_overdue` is active.

## Risks / Trade-offs

- **[Risk] Date format mismatch between systems** → Python script supports both UNIX epoch timestamps and ISO 8601 strings, with try/except fallbacks.

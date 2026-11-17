# Proposal

## Why

Students need to easily search for specific subjects by name and quickly identify which subjects require immediate attention due to overdue academic tasks. Providing a targeted search endpoint backed by date-filtering logic helps students prioritize urgent academic responsibilities.

## What Changes

- Add a Python script `scripts/filter_overdue_subjects.py` to evaluate task due dates against reference timestamps and filter subjects with overdue pending tasks, returning structured JSON results with error handling (`try/except`).
- Add a GET `/subjects/search` endpoint in `apis/subjects/subjects_search_GET.xs` allowing authenticated users to search their subjects by name or filter for subjects that have overdue tasks, strictly scoped to `user_id == $auth.id`.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `subjects`: Adds search capability to filter subjects by name or presence of overdue tasks while maintaining strict user data isolation.

## Impact

- APIs: adds GET `/subjects/search` under `apis/subjects/`.
- Scripts: adds `scripts/filter_overdue_subjects.py`.
- No database migrations required (uses existing `subjects` and `academic_tasks` tables).

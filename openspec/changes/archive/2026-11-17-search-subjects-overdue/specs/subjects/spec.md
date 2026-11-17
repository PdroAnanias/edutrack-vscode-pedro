# Spec Delta

## ADDED Requirements

### Requirement: Search Subjects by Name or Overdue Tasks
The system SHALL provide a search endpoint GET `/subjects/search` that allows authenticated users to filter subjects by name substring OR filter for subjects having overdue academic tasks.

#### Scenario: Search subjects by name substring
- **WHEN** an authenticated user sends a GET request to `/subjects/search` with a `name` query parameter
- **THEN** the system returns subjects owned by the authenticated user whose name contains the query

#### Scenario: Filter subjects having overdue tasks
- **WHEN** an authenticated user sends a GET request to `/subjects/search` with `has_overdue=true`
- **THEN** the system returns only subjects owned by the user that contain pending tasks with a due date prior to the current time

### Requirement: Python Overdue Evaluation Logic
The system SHALL provide a Python utility to calculate overdue status and filter subjects based on overdue tasks with structured error handling.

#### Scenario: Process tasks and filter overdue subjects
- **WHEN** academic task and subject data are supplied to the script
- **THEN** it detects tasks where `due_date` is in the past and `status != "completed"` and outputs the matching subjects as JSON

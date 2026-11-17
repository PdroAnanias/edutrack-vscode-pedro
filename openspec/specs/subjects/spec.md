# subjects Specification

## Purpose
Provides data storage and multi-tenant isolation for academic subject records in EduTrack AI.

## Requirements

### Requirement: Subjects Table Schema
The system SHALL store academic subject records in a dedicated `subjects` table containing id, created_at, name, teacher, hours, and user_id.

#### Scenario: Subject record structure
- **WHEN** a subject record is created or inspected
- **THEN** it contains an auto-incrementing integer `id`, a timestamp `created_at`, a text `name`, a text `teacher`, an integer `hours`, and an integer `user_id` referencing the authenticated user

### Requirement: Multi-Tenant User Isolation
The system SHALL enforce user isolation by associating every subject with the authenticated user's id.

#### Scenario: Associate subject with authenticated user
- **WHEN** a subject is stored in the database
- **THEN** the system sets `user_id` to reference the authenticated user and restricts access to records matching `user_id`

### Requirement: Create Subject Endpoint
The system SHALL provide a POST `/subjects` endpoint that creates a new subject record associated with the authenticated user.

#### Scenario: User creates a subject
- **WHEN** an authenticated user sends a valid POST request to `/subjects` with subject data (`name`, `teacher`, `hours`)
- **THEN** the system stores the record with `user_id` set to the authenticated user's ID and returns the created subject

### Requirement: List User Subjects Endpoint
The system SHALL provide a GET `/subjects` endpoint that returns all subjects belonging exclusively to the authenticated user.

#### Scenario: User queries their subjects
- **WHEN** an authenticated user sends a GET request to `/subjects`
- **THEN** the system queries the database filtered by `user_id == $auth.id` and returns the list of matching records

### Requirement: Get Subject by ID Endpoint
The system SHALL provide a GET `/subjects/{id}` endpoint that retrieves a single subject only if it belongs to the authenticated user.

#### Scenario: User retrieves a specific subject
- **WHEN** an authenticated user sends a GET request to `/subjects/{id}` for a record they own
- **THEN** the system returns the subject record where `id == $input.id` and `user_id == $auth.id`

### Requirement: Update Subject Endpoint
The system SHALL provide a PATCH `/subjects/{id}` endpoint allowing an authenticated user to update their own subject record.

#### Scenario: User updates an owned subject
- **WHEN** an authenticated user sends a PATCH request to `/subjects/{id}` with updated fields
- **THEN** the system updates and returns the subject record only if `id == $input.id` and `user_id == $auth.id`

### Requirement: Delete Subject Endpoint
The system SHALL provide a DELETE `/subjects/{id}` endpoint allowing an authenticated user to remove their own subject record.

#### Scenario: User deletes an owned subject
- **WHEN** an authenticated user sends a DELETE request to `/subjects/{id}`
- **THEN** the system removes the subject record from the database only if `id == $input.id` and `user_id == $auth.id`

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

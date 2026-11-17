# Spec Delta

## ADDED Requirements

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

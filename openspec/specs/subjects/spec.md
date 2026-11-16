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

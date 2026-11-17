# academic-tasks Specification

## Purpose
Provides data storage and multi-tenant isolation for student academic tasks and deadlines linked to enrolled subjects in EduTrack AI.

## Requirements

### Requirement: Academic Tasks Table Schema
The system SHALL store academic tasks in an `academic_tasks` table containing id, created_at, title, description, due_date, status, subject_id, and user_id.

#### Scenario: Academic task record structure
- **WHEN** an academic task record is created or inspected
- **THEN** it contains an auto-incrementing integer `id`, timestamp `created_at`, text `title`, text `description`, date/timestamp `due_date`, text `status` defaulting to "pending", integer `subject_id` referencing table `subjects`, and integer `user_id` referencing table `user`

### Requirement: User and Subject Isolation
The system SHALL enforce data isolation by associating every academic task with the authenticated student's user ID and a valid subject ID.

#### Scenario: Task saved with user and subject associations
- **WHEN** a task is saved in the database
- **THEN** the system links `user_id` to the authenticated user and `subject_id` to the target subject, restricting access exclusively to that user

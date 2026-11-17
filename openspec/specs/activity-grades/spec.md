# activity-grades Specification

## Purpose
Provides data storage and API endpoints to record and submit student activity grades in EduTrack AI.

## Requirements

### Requirement: Activity Grades Table Schema
The system SHALL store student activity grades in an `activity_grades` table containing id, created_at, academic_task_id, student_id, grade, and user_id.

#### Scenario: Storing activity grade record
- **WHEN** an activity grade is persisted
- **THEN** the record contains id, created_at, academic_task_id, student_id, grade, and user_id referencing the authenticated user

### Requirement: Submit Activity Grade Endpoint
The system SHALL provide a POST `/activity_grades` endpoint allowing authenticated teachers to submit a grade for a student on a specific academic activity.

#### Scenario: Teacher submits a grade for an activity
- **WHEN** an authenticated user posts a valid payload with academic_task_id, student_id, and grade to `/activity_grades`
- **THEN** the system creates the grade record scoped to the authenticated user and returns the created record

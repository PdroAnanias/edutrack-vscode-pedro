# performance-report Specification

## Purpose

Enables compilation and secure retrieval of student academic performance PDF reports in EduTrack AI.

## ADDED Requirements

### Requirement: Generate Student Performance PDF
The system SHALL provide a Python script that compiles student academic data (enrolled subjects, task progress, and grades) into a formatted PDF file.

#### Scenario: Generate PDF from student performance data
- **WHEN** valid student academic data is provided to the script
- **THEN** the script creates a formatted PDF document and returns a JSON object containing the file path and execution status

#### Scenario: Error handling during PDF generation
- **WHEN** invalid data or missing inputs are passed to the script
- **THEN** the script catches the exception using try/except and outputs a JSON response with status "error"

### Requirement: Download Performance Report Endpoint
The system SHALL provide an authenticated GET `/reports/performance/download` endpoint in Xano to deliver the performance report for the authenticated student.

#### Scenario: Authenticated student downloads report
- **WHEN** an authenticated user calls GET `/reports/performance/download`
- **THEN** the system generates or retrieves the student's report scoped to `user_id == $auth.id` and provides the file for download

#### Scenario: Unauthenticated request rejected
- **WHEN** an unauthenticated request attempts to access `/reports/performance/download`
- **THEN** the system returns an authentication required error and denies access

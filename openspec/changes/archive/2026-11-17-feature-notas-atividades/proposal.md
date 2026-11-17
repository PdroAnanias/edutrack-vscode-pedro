# Proposal

## Why

In EduTrack AI, instructors need to record academic performance by grading student submissions for assigned activities. This change introduces the capability for teachers to record grades for specific student activities.

## What Changes

- Add database table `activity_grades` in Xano to store activity grades with references to the task, student, and grading user.
- Add API endpoint POST `/activity_grades` to allow teachers to submit and record activity grades.

## Capabilities

### New Capabilities
- `activity-grades`: Recording and submitting grades for student activities.

### Modified Capabilities
<!-- None -->

## Impact

- Database schema: creates the `activity_grades` table.
- APIs: adds POST `/activity_grades` endpoint for grade entry.

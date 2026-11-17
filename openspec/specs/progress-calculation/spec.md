# progress-calculation Specification

## Purpose
Calculates academic progress percentage based on completed and total tasks and outputs structured JSON.

## Requirements

### Requirement: Calculate Completion Percentage
The system SHALL calculate the progress percentage based on completed and total items and output the result as a structured JSON object.

#### Scenario: Valid task counts calculation
- **WHEN** completed and total task counts are provided where total is greater than zero
- **THEN** the system computes `(completed / total) * 100` and outputs a JSON object with completed, total, and percentage

### Requirement: Zero Total and Input Error Handling
The system SHALL handle zero total items and malformed inputs gracefully without unhandled runtime exceptions.

#### Scenario: Zero total tasks
- **WHEN** total task count is zero
- **THEN** the system sets percentage to 0.0 and outputs a JSON object without raising a division-by-zero error

#### Scenario: Malformed or invalid input
- **WHEN** input arguments are invalid or non-numeric
- **THEN** the system catches the error using try/except and outputs a JSON response with an error description

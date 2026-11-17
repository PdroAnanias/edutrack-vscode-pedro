# Proposal

## Why

Students and academic systems need a reliable utility to determine the completion rate of academic obligations. Implementing a standalone Python script allows calculating progress metrics (completed tasks versus total tasks) and outputting the result as structured JSON.

## What Changes

- Add a Python script `scripts/calculate_progress.py` that takes completed and total counts (or task list inputs), calculates the progress percentage (`(completed / total) * 100`), handles edge cases (such as zero total items and invalid inputs) using structured error handling (`try/except`), and outputs the result in JSON format.

## Capabilities

### New Capabilities
- `progress-calculation`: Computing completion percentages and outputting structured JSON metrics for task progress.

### Modified Capabilities
<!-- None -->

## Impact

- Codebase: creates `scripts/calculate_progress.py`.
- No database migrations or API endpoints affected.

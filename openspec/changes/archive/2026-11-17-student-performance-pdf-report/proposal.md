# Proposal

## Why

Students, parents, and educators need downloadable academic performance reports summarizing enrolled subjects, completed tasks, and grades. Providing a script to generate PDF performance reports along with an authenticated Xano download endpoint enables students to securely export their academic records.

## What Changes

- Add Python script `scripts/generate_performance_report.py` to compile student academic data (subjects, task completion, and grades) into a formatted PDF report with robust error handling (`try/except`).
- Add Xano endpoint GET `/reports/performance/download` in `apis/reports/reports_performance_download_GET.xs` that validates authentication (`auth = "user"`), verifies multi-tenant isolation (`user_id == $auth.id`), and delivers the performance report for download.

## Capabilities

### New Capabilities
- `performance-report`: Generation and secure retrieval of student academic performance PDF reports.

### Modified Capabilities
<!-- None -->

## Impact

- Scripts: adds `scripts/generate_performance_report.py`.
- APIs: adds `apis/reports/api_group.xs` and `apis/reports/reports_performance_download_GET.xs`.
- No database migrations required.

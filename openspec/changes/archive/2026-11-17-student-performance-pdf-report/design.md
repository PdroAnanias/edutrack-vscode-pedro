# Design

## Context

See proposal.md for motivation and context.
EduTrack AI uses Python scripts in `scripts/` for offline processing and data utilities, while Xano serves authenticated RESTful API endpoints. Student performance data spans `subjects`, `academic_tasks`, and `activity_grades`, all partitioned by `user_id`.

## Goals / Non-Goals

**Goals:**
- Implement `scripts/generate_performance_report.py` to compile student academic data into a valid PDF document with zero external dependency requirements (or optional reportlab/fpdf) and robust `try/except` error handling.
- Create API group `Reports` in `apis/reports/api_group.xs`.
- Create GET `/reports/performance/download` in `apis/reports/reports_performance_download_GET.xs` scoped to `user_id == $auth.id`.

**Non-Goals:**
- Frontend FlutterFlow UI implementation.
- Database schema changes (uses existing tables).
- Direct push/sync/deploy to the remote Xano server.

## Decisions

- **Python PDF Generator**:
  - Implement a lightweight, self-contained PDF generator in `scripts/generate_performance_report.py` producing standard PDF-1.4 format without requiring external pip dependencies, while supporting structured error handling.
  - Return JSON output indicating generation status and file path.
- **Xano Endpoint**:
  - `query "reports/performance/download" verb=GET` under `api_group = "Reports"`.
  - Enforces `auth = "user"` and queries `subjects`, `academic_tasks`, and `activity_grades` strictly matching `user_id == $auth.id`.

## Risks / Trade-offs

- **[Risk] Missing pip packages on target machines** → Self-contained standard library implementation avoids environment installation errors.

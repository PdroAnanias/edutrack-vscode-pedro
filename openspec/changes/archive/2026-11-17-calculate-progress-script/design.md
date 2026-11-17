# Design

## Context

See proposal.md for motivation and context.
EduTrack AI uses standard Python scripts for automation, data processing, and metrics. Per AGENTS.md, Python logic must include error handling (`try/except`) and follow English naming standards.

## Goals / Non-Goals

**Goals:**
- Implement `scripts/calculate_progress.py` to calculate progress percentage (`(completed / total) * 100`).
- Return results formatted as JSON.
- Safely handle edge cases including `total == 0` and non-numeric inputs using structured `try/except` blocks.
- Provide a reusable function `calculate_progress(completed, total)` and a CLI entrypoint.

**Non-Goals:**
- Direct Xano database querying or API endpoint generation (strictly out of scope per user request).
- Frontend UI components or FlutterFlow integration.
- Adding third-party external dependencies (standard Python library only).

## Decisions

- **CLI Interface**: Accept `--completed` and `--total` arguments via `argparse` with fallback to positional arguments or interactive defaults for testing.
- **Output Schema**:
  ```json
  {
    "total": 10,
    "completed": 5,
    "percentage": 50.0,
    "status": "success"
  }
  ```
- **Error Handling**: Wrap CLI and calculation logic in `try/except`, returning structured error JSON (with non-zero exit code or error status) when inputs are invalid.
- **Zero Total Handling**: When `total == 0`, percentage returns `0.0` rather than throwing `ZeroDivisionError`.

## Risks / Trade-offs

- **[Risk] Float precision variations** → Mitigated by rounding percentages to two decimal places (e.g. `round(percentage, 2)`).

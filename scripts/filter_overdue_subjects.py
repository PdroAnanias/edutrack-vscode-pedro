import argparse
from datetime import datetime, timezone
import json
import os
import sys


def parse_timestamp(value) -> datetime:
    """Parse integer/float timestamp or ISO string into datetime (UTC)."""
    if isinstance(value, (int, float)):
        # Handle millisecond timestamps if larger than year 3000 in seconds
        if value > 1e11:
            value = value / 1000.0
        return datetime.fromtimestamp(value, tz=timezone.utc)
    if isinstance(value, str):
        # Remove trailing Z for fromisoformat compatibility
        clean_val = value.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(clean_val)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            # Fallback for simple date 'YYYY-MM-DD'
            dt = datetime.strptime(value.split("T")[0], "%Y-%m-%d")
            return dt.replace(tzinfo=timezone.utc)
    raise ValueError(f"Unsupported date format: {value}")


def filter_overdue_subjects(
    subjects: list,
    tasks: list,
    name_filter: str = None,
    only_overdue: bool = False,
    now: datetime = None,
) -> dict:
    """Filter subjects by name or overdue task status."""
    try:
        if now is None:
            now = datetime.now(timezone.utc)

        # 1. Identify overdue subject IDs
        overdue_subject_ids = set()
        overdue_tasks = []

        for task in tasks:
            if not isinstance(task, dict):
                continue

            status = str(task.get("status", "")).strip().lower()
            if status == "completed":
                continue

            due_date_raw = task.get("due_date")
            if not due_date_raw:
                continue

            try:
                task_due = parse_timestamp(due_date_raw)
                if task_due < now:
                    overdue_tasks.append(task)
                    if "subject_id" in task and task["subject_id"] is not None:
                        overdue_subject_ids.add(task["subject_id"])
            except Exception:
                continue

        # 2. Filter subjects
        matched_subjects = []
        for subject in subjects:
            if not isinstance(subject, dict):
                continue

            subj_id = subject.get("id")
            subj_name = str(subject.get("name", "")).strip()

            is_overdue = subj_id in overdue_subject_ids

            # Name match check
            matches_name = True
            if name_filter:
                matches_name = name_filter.lower() in subj_name.lower()

            # Apply filter conditions
            if only_overdue:
                if is_overdue and matches_name:
                    subject_copy = dict(subject)
                    subject_copy["has_overdue_tasks"] = True
                    matched_subjects.append(subject_copy)
            else:
                if matches_name or is_overdue:
                    subject_copy = dict(subject)
                    subject_copy["has_overdue_tasks"] = is_overdue
                    matched_subjects.append(subject_copy)

        return {
            "status": "success",
            "total_subjects": len(subjects),
            "matched_count": len(matched_subjects),
            "overdue_tasks_count": len(overdue_tasks),
            "subjects": matched_subjects,
        }

    except Exception as exc:
        return {
            "status": "error",
            "message": str(exc),
        }


def load_json_or_file(source: str):
    """Load JSON from literal string or file path."""
    if not source:
        return []
    if os.path.exists(source):
        with open(source, "r", encoding="utf-8") as f:
            return json.load(f)
    return json.loads(source)


def main():
    parser = argparse.ArgumentParser(
        description="Filter subjects by name or overdue task status."
    )
    parser.add_argument(
        "--subjects",
        "-s",
        type=str,
        default="[]",
        help="JSON string or file path containing subjects list",
    )
    parser.add_argument(
        "--tasks",
        "-t",
        type=str,
        default="[]",
        help="JSON string or file path containing academic tasks list",
    )
    parser.add_argument(
        "--name",
        "-n",
        type=str,
        default=None,
        help="Filter subjects by name substring",
    )
    parser.add_argument(
        "--only-overdue",
        action="store_true",
        help="Return only subjects with overdue pending tasks",
    )

    try:
        args = parser.parse_args()
        subjects = load_json_or_file(args.subjects)
        tasks = load_json_or_file(args.tasks)

        result = filter_overdue_subjects(
            subjects=subjects,
            tasks=tasks,
            name_filter=args.name,
            only_overdue=args.only_overdue,
        )

        print(json.dumps(result, indent=2))
        if result.get("status") == "error":
            sys.exit(1)

    except Exception as exc:
        print(
            json.dumps({"status": "error", "message": str(exc)}, indent=2)
        )
        sys.exit(1)


if __name__ == "__main__":
    main()

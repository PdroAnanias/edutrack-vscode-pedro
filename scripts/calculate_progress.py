import argparse
import json
import sys


def calculate_progress(completed: int, total: int) -> dict:
    """Calculate progress percentage and return structured metrics."""
    try:
        completed = int(completed)
        total = int(total)

        if completed < 0 or total < 0:
            raise ValueError("Completed and total values must be non-negative.")

        if total == 0:
            percentage = 0.0
        else:
            percentage = round((completed / total) * 100, 2)

        return {
            "status": "success",
            "completed": completed,
            "total": total,
            "percentage": percentage,
        }
    except Exception as exc:
        return {
            "status": "error",
            "message": str(exc),
        }


def main():
    parser = argparse.ArgumentParser(
        description="Calculate completion progress percentage."
    )
    parser.add_argument(
        "--completed",
        "-c",
        type=int,
        required=False,
        help="Number of completed tasks",
    )
    parser.add_argument(
        "--total",
        "-t",
        type=int,
        required=False,
        help="Total number of tasks",
    )
    parser.add_argument(
        "positional_args",
        nargs="*",
        type=int,
        help="Optional positional arguments: [completed] [total]",
    )

    try:
        args = parser.parse_args()

        completed = args.completed
        total = args.total

        if completed is None or total is None:
            if len(args.positional_args) >= 2:
                completed = args.positional_args[0]
                total = args.positional_args[1]
            elif len(args.positional_args) == 1:
                completed = args.positional_args[0]
                total = args.positional_args[0]
            else:
                raise ValueError("Both completed and total arguments are required.")

        result = calculate_progress(completed, total)
        print(json.dumps(result, indent=2))
        if result.get("status") == "error":
            sys.exit(1)
    except Exception as exc:
        error_output = {
            "status": "error",
            "message": str(exc),
        }
        print(json.dumps(error_output, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()

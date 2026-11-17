import argparse
from datetime import datetime, timezone
import json
import os
import sys

# Optional reportlab import; pure-python fallback implemented below
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


def parse_json_input(input_val, default=None):
    """Parse JSON from either a raw JSON string or a file path."""
    if input_val is None:
        return default if default is not None else []
    if isinstance(input_val, (list, dict)):
        return input_val
    if isinstance(input_val, str):
        trimmed = input_val.strip()
        if os.path.isfile(trimmed):
            with open(trimmed, "r", encoding="utf-8") as f:
                return json.load(f)
        return json.loads(trimmed)
    return default if default is not None else []


def calculate_metrics(student_id, student_name, subjects, tasks, grades):
    """Compile and aggregate academic performance metrics."""
    total_subjects = len(subjects)
    total_tasks = len(tasks)
    completed_tasks = 0
    pending_tasks = 0
    overdue_tasks = 0
    now = datetime.now(timezone.utc)

    # Process tasks
    subject_tasks_map = {s.get("id"): [] for s in subjects if isinstance(s, dict) and "id" in s}
    for t in tasks:
        if not isinstance(t, dict):
            continue
        status = str(t.get("status", "")).strip().lower()
        if status == "completed":
            completed_tasks += 1
        else:
            pending_tasks += 1
            due_date = t.get("due_date")
            if due_date:
                try:
                    if isinstance(due_date, (int, float)):
                        due_ts = due_date / 1000.0 if due_date > 1e11 else due_date
                        due_dt = datetime.fromtimestamp(due_ts, tz=timezone.utc)
                    else:
                        clean_date = str(due_date).replace("Z", "+00:00")
                        due_dt = datetime.fromisoformat(clean_date)
                        if due_dt.tzinfo is None:
                            due_dt = due_dt.replace(tzinfo=timezone.utc)
                    if due_dt < now:
                        overdue_tasks += 1
                except Exception:
                    pass

        sub_id = t.get("subject_id")
        if sub_id in subject_tasks_map:
            subject_tasks_map[sub_id].append(t)

    completion_rate = (
        round((completed_tasks / total_tasks) * 100, 2) if total_tasks > 0 else 0.0
    )

    # Process grades
    numeric_grades = []
    subject_grades_map = {s.get("id"): [] for s in subjects if isinstance(s, dict) and "id" in s}
    for g in grades:
        if not isinstance(g, dict):
            continue
        grade_val = g.get("grade")
        if grade_val is not None:
            try:
                val = float(grade_val)
                numeric_grades.append(val)
                sub_id = g.get("subject_id")
                if sub_id in subject_grades_map:
                    subject_grades_map[sub_id].append(val)
            except (ValueError, TypeError):
                pass

    average_grade = (
        round(sum(numeric_grades) / len(numeric_grades), 2)
        if numeric_grades
        else None
    )

    # Per-subject breakdown
    subject_summaries = []
    for sub in subjects:
        if not isinstance(sub, dict):
            continue
        sub_id = sub.get("id")
        sub_tasks = subject_tasks_map.get(sub_id, [])
        sub_total_tasks = len(sub_tasks)
        sub_completed_tasks = sum(
            1 for t in sub_tasks if str(t.get("status", "")).strip().lower() == "completed"
        )
        sub_grades = subject_grades_map.get(sub_id, [])
        sub_avg_grade = (
            round(sum(sub_grades) / len(sub_grades), 2) if sub_grades else None
        )
        sub_rate = (
            round((sub_completed_tasks / sub_total_tasks) * 100, 2)
            if sub_total_tasks > 0
            else 0.0
        )

        subject_summaries.append({
            "id": sub_id,
            "name": sub.get("name", "Unnamed Subject"),
            "code": sub.get("code", ""),
            "total_tasks": sub_total_tasks,
            "completed_tasks": sub_completed_tasks,
            "completion_rate": sub_rate,
            "average_grade": sub_avg_grade,
        })

    return {
        "student_id": student_id,
        "student_name": student_name,
        "generated_at": now.isoformat(),
        "total_subjects": total_subjects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "overdue_tasks": overdue_tasks,
        "completion_rate": completion_rate,
        "average_grade": average_grade,
        "subjects": subject_summaries,
    }


def generate_pdf_reportlab(summary: dict, output_path: str):
    """Generate PDF report using ReportLab canvas."""
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    # Header Bar
    c.setFillColor(colors.HexColor("#1A365D"))  # Deep Navy
    c.rect(0, height - 80, width, 80, fill=1, stroke=0)

    # Header Text
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(40, height - 45, "EduTrack AI - Academic Performance Report")
    c.setFont("Helvetica", 10)
    c.drawString(40, height - 65, f"Generated on: {summary['generated_at']}")

    # Student Info Section
    y = height - 120
    c.setFillColor(colors.HexColor("#2D3748"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Student Information")

    y -= 25
    c.setFont("Helvetica", 11)
    c.drawString(40, y, f"Student Name: {summary.get('student_name', 'N/A')}")
    c.drawString(320, y, f"Student ID: {summary.get('student_id', 'N/A')}")

    # Summary Metrics Cards
    y -= 40
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Academic Summary")

    y -= 70
    card_width = 115
    card_height = 55
    spacing = 15
    start_x = 40

    cards = [
        ("Subjects", str(summary["total_subjects"]), "#EBF8FF", "#2B6CB0"),
        ("Tasks Total", str(summary["total_tasks"]), "#EDF2F7", "#4A5568"),
        ("Completed", str(summary["completed_tasks"]), "#F0FFF4", "#2F855A"),
        ("Progress", f"{summary['completion_rate']}%", "#FAF5FF", "#6B46C1"),
    ]

    for idx, (label, val, bg, text_col) in enumerate(cards):
        cx = start_x + idx * (card_width + spacing)
        c.setFillColor(colors.HexColor(bg))
        c.roundRect(cx, y, card_width, card_height, 4, fill=1, stroke=0)
        c.setFillColor(colors.HexColor(text_col))
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(cx + card_width / 2, y + 28, val)
        c.setFont("Helvetica", 9)
        c.drawCentredString(cx + card_width / 2, y + 12, label)

    # Average Grade & Overdue notes
    y -= 30
    c.setFillColor(colors.HexColor("#2D3748"))
    c.setFont("Helvetica", 11)
    avg_str = f"{summary['average_grade']:.2f}" if summary["average_grade"] is not None else "N/A"
    c.drawString(40, y, f"Overall Average Grade: {avg_str} / 10.0")
    if summary["overdue_tasks"] > 0:
        c.setFillColor(colors.HexColor("#C53030"))
        c.drawString(320, y, f"Overdue Tasks: {summary['overdue_tasks']}")

    # Subjects Breakdown Table
    y -= 45
    c.setFillColor(colors.HexColor("#2D3748"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Subject Breakdown")

    # Table Header
    y -= 25
    c.setFillColor(colors.HexColor("#EDF2F7"))
    c.rect(40, y - 5, width - 80, 22, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#2D3748"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Subject Name")
    c.drawString(220, y, "Tasks Total")
    c.drawString(310, y, "Completed")
    c.drawString(400, y, "Progress")
    c.drawString(480, y, "Avg Grade")

    # Table Rows
    y -= 20
    c.setFont("Helvetica", 10)
    for sub in summary.get("subjects", []):
        if y < 60:
            c.showPage()
            y = height - 60
        sub_avg = f"{sub['average_grade']:.2f}" if sub.get("average_grade") is not None else "-"
        c.drawString(50, y, str(sub.get("name", "Unknown"))[:25])
        c.drawString(220, y, str(sub.get("total_tasks", 0)))
        c.drawString(310, y, str(sub.get("completed_tasks", 0)))
        c.drawString(400, y, f"{sub.get('completion_rate', 0)}%")
        c.drawString(480, y, sub_avg)
        y -= 20

    # Footer
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#718096"))
    c.drawString(40, 30, "EduTrack AI - Automated Student Performance Evaluation")
    c.drawRightString(width - 40, 30, "Page 1 of 1")

    c.save()


def generate_pdf_builtin(summary: dict, output_path: str):
    """Pure-Python fallback PDF generator creating a standard PDF-1.4 file."""
    lines = [
        "EduTrack AI - Academic Performance Report",
        f"Generated on: {summary['generated_at']}",
        "",
        "Student Information:",
        f"  Student Name: {summary.get('student_name', 'N/A')}",
        f"  Student ID:   {summary.get('student_id', 'N/A')}",
        "",
        "Academic Summary:",
        f"  Total Subjects:    {summary['total_subjects']}",
        f"  Total Tasks:       {summary['total_tasks']}",
        f"  Completed Tasks:   {summary['completed_tasks']}",
        f"  Pending Tasks:     {summary['pending_tasks']}",
        f"  Overdue Tasks:     {summary['overdue_tasks']}",
        f"  Completion Rate:   {summary['completion_rate']}%",
        f"  Average Grade:     {summary.get('average_grade', 'N/A')}",
        "",
        "Subject Breakdown:",
    ]

    for sub in summary.get("subjects", []):
        sub_avg = f"{sub['average_grade']:.2f}" if sub.get("average_grade") is not None else "N/A"
        lines.append(
            f"  - {sub.get('name', 'Unknown')}: {sub.get('completed_tasks', 0)}/{sub.get('total_tasks', 0)} tasks ({sub.get('completion_rate', 0)}%), Avg Grade: {sub_avg}"
        )

    # Build PDF 1.4 stream commands
    stream_content = "BT\n/F1 11 Tf\n50 740 Td\n15 TL\n"
    for line in lines:
        escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        stream_content += f"({escaped}) '\n"
    stream_content += "ET\n"
    stream_bytes = stream_content.encode("latin-1", errors="replace")

    objects = []
    # 1: Catalog
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    # 2: Pages
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    # 3: Page
    objects.append(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
    )
    # 4: Font
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    # 5: Contents
    objects.append(
        f"<< /Length {len(stream_bytes)} >>\nstream\n".encode("latin-1")
        + stream_bytes
        + b"\nendstream"
    )

    pdf_output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = []
    for idx, obj in enumerate(objects, start=1):
        offsets.append(len(pdf_output))
        pdf_output.extend(f"{idx} 0 obj\n".encode("latin-1"))
        pdf_output.extend(obj)
        pdf_output.extend(b"\nendobj\n")

    xref_offset = len(pdf_output)
    pdf_output.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    pdf_output.extend(b"0000000000 65535 f \n")
    for off in offsets:
        pdf_output.extend(f"{off:010d} 00000 n \n".encode("latin-1"))

    pdf_output.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode(
            "latin-1"
        )
    )

    with open(output_path, "wb") as f:
        f.write(pdf_output)


def generate_report(student_id, student_name, subjects, tasks, grades, output_path: str = None) -> dict:
    """Generate the complete PDF performance report and return summary dict."""
    try:
        if not student_id and not student_name:
            raise ValueError("Either student_id or student_name must be provided.")

        if not output_path:
            clean_id = str(student_id or "student").replace(" ", "_")
            output_path = f"student_report_{clean_id}.pdf"

        # Ensure output directory exists if provided
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        # Calculate metrics
        summary = calculate_metrics(student_id, student_name, subjects, tasks, grades)

        # Generate PDF
        if REPORTLAB_AVAILABLE:
            generate_pdf_reportlab(summary, output_path)
        else:
            generate_pdf_builtin(summary, output_path)

        return {
            "status": "success",
            "file_path": os.path.abspath(output_path),
            "summary": summary,
        }
    except Exception as exc:
        return {
            "status": "error",
            "message": str(exc),
        }


def main():
    parser = argparse.ArgumentParser(
        description="Generate a PDF academic performance report for a student."
    )
    parser.add_argument("--student-id", type=str, default="", help="Student ID")
    parser.add_argument("--student-name", type=str, default="Student", help="Student full name")
    parser.add_argument("--subjects", type=str, default="[]", help="JSON string or file path for subjects")
    parser.add_argument("--tasks", type=str, default="[]", help="JSON string or file path for tasks")
    parser.add_argument("--grades", type=str, default="[]", help="JSON string or file path for grades")
    parser.add_argument("--data", type=str, default=None, help="Combined JSON string or file path with all payload data")
    parser.add_argument("--output", "-o", type=str, default="", help="Output PDF file path")

    try:
        args = parser.parse_args()

        student_id = args.student_id
        student_name = args.student_name
        subjects = []
        tasks = []
        grades = []

        if args.data:
            data = parse_json_input(args.data, default={})
            student_id = data.get("student_id", student_id)
            student_name = data.get("student_name", student_name)
            subjects = data.get("subjects", [])
            tasks = data.get("tasks", [])
            grades = data.get("grades", [])
        else:
            subjects = parse_json_input(args.subjects, default=[])
            tasks = parse_json_input(args.tasks, default=[])
            grades = parse_json_input(args.grades, default=[])

        output_path = args.output.strip() if args.output else None

        result = generate_report(
            student_id=student_id,
            student_name=student_name,
            subjects=subjects,
            tasks=tasks,
            grades=grades,
            output_path=output_path,
        )

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

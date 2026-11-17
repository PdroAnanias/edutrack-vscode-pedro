// Generate and download student performance report data
query "reports/performance/download" verb=GET {
  api_group = "Reports"
  auth = "user"

  input {
  }

  stack {
    // 1. Fetch authenticated student profile
    db.get user {
      field_name = "id"
      field_value = $auth.id
    } as $student

    precondition ($student != null) {
      error_type = "notfound"
      error = "Student profile not found."
    }

    // 2. Fetch subjects for the authenticated user
    db.query subjects {
      where = $db.subjects.user_id == $auth.id
      return = {type: "list"}
    } as $subjects

    // 3. Fetch academic tasks for the authenticated user
    db.query academic_tasks {
      where = $db.academic_tasks.user_id == $auth.id
      return = {type: "list"}
    } as $tasks

    // 4. Construct report payload
    var $report {
      value = {
        report_title: "Student Academic Performance Report",
        student_id: $auth.id,
        student_name: $student.name,
        student_email: $student.email,
        subjects: $subjects,
        tasks: $tasks
      }
    }
  }

  response = $report
}

// Search subjects by name or overdue tasks
query "subjects/search" verb=GET {
  api_group = "Subjects"
  auth = "user"

  input {
    text search? filters=trim
    text name? filters=trim
  }

  stack {
    // 1. Retrieve overdue pending tasks for the authenticated user
    db.query academic_tasks {
      where = $db.academic_tasks.user_id == $auth.id && $db.academic_tasks.status == "pending" && $db.academic_tasks.due_date < "now"
      return = {type: "list"}
    } as $overdue_tasks
  
    // 2. Query subjects belonging to the authenticated user matching search parameter OR having overdue tasks
    db.query subjects {
      where = $db.subjects.user_id == $auth.id && ($db.subjects.name == $input.search || $db.subjects.name == $input.name || $db.subjects.id == $overdue_tasks.subject_id)
      return = {type: "list"}
    } as $subjects
  }

  response = $subjects
}
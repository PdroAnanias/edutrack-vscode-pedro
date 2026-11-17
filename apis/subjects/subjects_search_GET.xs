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
  
    // 2. Extract simple array of integer subject IDs using native foreach loop
    var $overdue_subject_ids {
      value = []
    }
  
    foreach ($overdue_tasks) {
      each as $task {
        conditional {
          if ($task.subject_id != null) {
            array.push $overdue_subject_ids {
              value = $task.subject_id
            }
          }
        }
      }
    }
  
    // 3. Query subjects belonging to the authenticated user matching search parameter OR having overdue tasks
    db.query subjects {
      where = $db.subjects.user_id == $auth.id && ($db.subjects.name includes $input.search || $db.subjects.name includes $input.name || ($db.subjects.id in $overdue_subject_ids))
      return = {type: "list"}
    } as $subjects
  }

  response = $subjects
}
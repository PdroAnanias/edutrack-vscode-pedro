// Search subjects by name or filter by overdue tasks
query "subjects/search" verb=GET {
  api_group = "Subjects"
  auth = "user"

  input {
    text name? filters=trim
    bool has_overdue?=false
  }

  stack {
    // 1. Retrieve all subjects belonging exclusively to the authenticated user
    db.query subjects {
      where = $db.subjects.user_id == $auth.id
      return = {type: "list"}
    } as $subjects

    // 2. Branch: Filter by overdue tasks if requested
    conditional ($input.has_overdue == true) {
      db.query academic_tasks {
        where = ($db.academic_tasks.user_id == $auth.id) && ($db.academic_tasks.status != "completed") && ($db.academic_tasks.due_date < "now")
        return = {type: "list"}
      } as $overdue_tasks

      var $overdue_subject_ids {
        value = $overdue_tasks|pluck:"subject_id"|unique
      }

      // Filter: Match name OR match overdue tasks
      var $results {
        value = $subjects|filter:($input.name != null ? ($this.name|contains:$input.name || $overdue_subject_ids|includes:$this.id) : ($overdue_subject_ids|includes:$this.id))
      }
    }
    else {
      conditional ($input.name != null) {
        var $results {
          value = $subjects|filter:($this.name|contains:$input.name)
        }
      }
      else {
        var $results {
          value = $subjects
        }
      }
    }
  }

  response = $results
}

// Delete a subject record belonging to the authenticated user
query "subjects/{id}" verb=DELETE {
  api_group = "Subjects"
  auth = "user"

  input {
    int id filters=min:1
  }

  stack {
    // 1. Retrieve the subject
    db.get subjects {
      field_name = "id"
      field_value = $input.id
    } as $subject
  
    precondition ($subject != null) {
      error_type = "notfound"
      error = "Subject not found."
    }
  
    // 2. Enforce user ownership
    precondition ($subject.user_id == $auth.id) {
      error_type = "accessdenied"
      error = "You don't have access to delete this subject."
    }
  
    // 3. Delete the subject
    db.del subjects {
      field_name = "id"
      field_value = $subject.id
    }
  }

  response = null
}
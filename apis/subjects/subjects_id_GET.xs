// Retrieve a specific subject belonging to the authenticated user
query "subjects/{id}" verb=GET {
  api_group = "Subjects"
  auth = "user"

  input {
    int id filters=min:1
  }

  stack {
    db.get subjects {
      field_name = "id"
      field_value = $input.id
    } as $subject
  
    precondition ($subject != null) {
      error_type = "notfound"
      error = "Subject not found."
    }
  
    precondition ($subject.user_id == $auth.id) {
      error_type = "accessdenied"
      error = "Access denied."
    }
  }

  response = $subject
}
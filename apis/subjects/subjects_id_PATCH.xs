// Edit a subject record belonging to the authenticated user
query "subjects/{id}" verb=PATCH {
  api_group = "Subjects"
  auth = "user"

  input {
    int id filters=min:1
    text name? filters=trim
    text teacher? filters=trim
    int hours?
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
      error = "You don't have access to edit this subject."
    }
  
    // 3. Update the subject fields
    db.patch subjects {
      field_name = "id"
      field_value = $subject.id
      data = {
        name   : $input.name
        teacher: $input.teacher
        hours  : $input.hours
      }|filter_null|filter_empty_text
    } as $updated_subject
  }

  response = $updated_subject
}
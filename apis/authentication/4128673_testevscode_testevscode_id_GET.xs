// Get testeVSCODE record
query "testevscode/{testevscode_id}" verb=GET {
  api_group = "Authentication"

  input {
    int testevscode_id? filters=min:1
  }

  stack {
    db.get testeVSCODE {
      field_name = "id"
      field_value = $input.testevscode_id
    } as $testevscode
  
    precondition ($testevscode != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $testevscode
}
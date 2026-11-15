// Delete testeVSCODE record.
query "testevscode/{testevscode_id}" verb=DELETE {
  api_group = "Authentication"

  input {
    int testevscode_id? filters=min:1
  }

  stack {
    db.del testeVSCODE {
      field_name = "id"
      field_value = $input.testevscode_id
    }
  }

  response = null
}
// Edit testeVSCODE record
query "testevscode/{testevscode_id}" verb=PATCH {
  api_group = "Authentication"

  input {
    int testevscode_id? filters=min:1
    dblink {
      table = "testeVSCODE"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch testeVSCODE {
      field_name = "id"
      field_value = $input.testevscode_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $testevscode
  }

  response = $testevscode
}
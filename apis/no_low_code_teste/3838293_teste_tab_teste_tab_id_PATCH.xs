// Edit teste tab record
query "teste_tab/{teste_tab_id}" verb=PATCH {
  api_group = "no low code TESTE"

  input {
    int teste_tab_id? filters=min:1
    dblink {
      table = ""
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch "" {
      field_name = "id"
      field_value = $input.teste_tab_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $model
  }

  response = $model
}
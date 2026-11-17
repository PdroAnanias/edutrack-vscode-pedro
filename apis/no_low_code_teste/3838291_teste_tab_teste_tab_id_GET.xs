// Get teste tab record
query "teste_tab/{teste_tab_id}" verb=GET {
  api_group = "no low code TESTE"

  input {
    int teste_tab_id? filters=min:1
  }

  stack {
    db.get "" {
      field_name = "id"
      field_value = $input.teste_tab_id
    } as $model
  
    precondition ($model != null) {
      error_type = "notfound"
      error = "Not Found"
    }
  }

  response = $model
}
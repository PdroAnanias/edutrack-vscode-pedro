// Delete teste tab record
query "teste_tab/{teste_tab_id}" verb=DELETE {
  api_group = "no low code TESTE"

  input {
    int teste_tab_id? filters=min:1
  }

  stack {
    db.del "" {
      field_name = "id"
      field_value = $input.teste_tab_id
    }
  }

  response = null
}
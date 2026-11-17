// Query all teste tab records
query teste_tab verb=GET {
  api_group = "no low code TESTE"

  input {
  }

  stack {
    db.query "" {
      return = {type: "list"}
    } as $model
  }

  response = $model
}
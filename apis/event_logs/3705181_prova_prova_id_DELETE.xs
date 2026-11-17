// Delete Prova record.
query "prova/{prova_id}" verb=DELETE {
  api_group = "Event Logs"

  input {
    int prova_id? filters=min:1
  }

  stack {
    db.del "" {
      field_name = "id"
      field_value = $input.prova_id
    }
  }

  response = null
}
// Query all Prova records
query prova verb=GET {
  api_group = "Event Logs"

  input {
  }

  stack {
    db.query "" {
      return = {type: "list"}
    } as $prova
  }

  response = $prova
}
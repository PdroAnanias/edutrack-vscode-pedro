// Query all STATUS_OP records
query status_op verb=GET {
  api_group = "Application Data Persistence"

  input {
  }

  stack {
    db.query "" {
      return = {type: "list"}
    } as $status_op
  }

  response = $status_op
}
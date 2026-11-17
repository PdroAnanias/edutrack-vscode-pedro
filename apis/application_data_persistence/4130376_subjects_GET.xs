// Query all subjects records
query subjects verb=GET {
  api_group = "Application Data Persistence"

  input {
  }

  stack {
    db.query subjects {
      return = {type: "list"}
    } as $subjects
  }

  response = $subjects
}
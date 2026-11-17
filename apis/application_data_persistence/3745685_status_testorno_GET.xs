// Query all STATUS_TESTORNO records
query status_testorno verb=GET {
  api_group = "Application Data Persistence"

  input {
  }

  stack {
    db.query "" {
      return = {type: "list"}
    } as $status_testorno
  }

  response = $status_testorno
}
// Query all STATUS_ITEM records
query status_item verb=GET {
  api_group = "Application Data Persistence"

  input {
  }

  stack {
    db.query "" {
      return = {type: "list"}
    } as $status_item
  }

  response = $status_item
}
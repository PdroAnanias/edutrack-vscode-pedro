// Add subjects record
query subjects verb=POST {
  api_group = "Application Data Persistence"

  input {
    dblink {
      table = "subjects"
    }
  }

  stack {
    db.add subjects {
      enforce_hidden_fields = false
      data = {created_at: "now"}
    } as $subjects
  }

  response = $subjects
}
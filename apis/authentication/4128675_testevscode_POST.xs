// Add testeVSCODE record
query testevscode verb=POST {
  api_group = "Authentication"

  input {
    dblink {
      table = "testeVSCODE"
    }
  }

  stack {
    db.add testeVSCODE {
      enforce_hidden_fields = false
      data = {created_at: "now"}
    } as $testevscode
  }

  response = $testevscode
}
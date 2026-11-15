// Query all testeVSCODE records
query testevscode verb=GET {
  api_group = "Authentication"

  input {
  }

  stack {
    db.query testeVSCODE {
      return = {type: "list"}
    } as $testevscode
  }

  response = $testevscode
}
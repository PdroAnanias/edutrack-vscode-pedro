// Dado um cep, atualize se já existir, inserir se não, sempre devolver o CEP.
query upsertCEP verb=POST {
  api_group = "Application Data Persistence"

  input {
    text cep? filters=trim
    text cidade? filters=trim
    text uf? filters=trim
  }

  stack {
    db.query "" {
      where = $db.CEP.cep == $input.cep
      return = {type: "list"}
    } as $CEP1
  
    conditional {
      if ($var.CEP1[0].cep == $input.cep) {
        db.patch "" {
          field_name = "id"
          field_value = $var.CEP1[0].id
          data = {cidade: $input.cidade, estado: $input.uf}
        } as $CEP2
      }
    
      else {
        db.add "" {
          enforce_hidden_fields = false
          data = {
            created_at: "now"
            cep       : $input.cep
            uf        : $input.uf
            cidade    : $input.cidade
          }
        } as $CEP2
      }
    }
  }

  response = $CEP2
  tags = ["módulo de cadastro do cliente"]
}
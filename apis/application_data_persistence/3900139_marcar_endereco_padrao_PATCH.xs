// Apenas deixa 1 endereco padrao por cliente
query marcarEnderecoPadrao verb=PATCH {
  api_group = "Application Data Persistence"

  input {
    int endereco_id? {
      table = ""
    }
  }

  stack {
    db.get "" {
      field_name = "id"
      field_value = $input.endereco_id
    } as $ENDERECO1
  
    db.patch "" {
      field_name = "id"
      field_value = $input.endereco_id
      data = {padrao: true}
    } as $ENDERECO2
  
    db.query "" {
      where = $ENDERECO1.cliente_id == $db.ENDERECO.cliente_id && $ENDERECO1.id != $db.ENDERECO.id
      return = {type: "list"}
    } as $ENDERECO3
  
    array.map ($ENDERECO3) {
      by = {id: $this.id, padrao: false}
    } as $x1
  
    db.bulk.patch "" {
      items = $x1
    } as $ENDERECO4
  }

  response = {padrao: $ENDERECO2, naoPadrao: $ENDERECO4}
}
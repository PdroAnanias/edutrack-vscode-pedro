query consultaEnderecoDoCliente verb=GET {
  api_group = "Application Data Persistence"

  input {
    text authtoken? filters=trim
  }

  stack {
    api.request {
      url = "https://x8ki-letl-twmt.n7.xano.io/api:Cia9mhOi/buscaCliente"
      method = "GET"
      params = {authtoken: $input.authtoken}
      headers = [
        "Authorization: Bearer " ~$input.authtoken
        "Content-Type: application/json"
      ]
    
    } as $api1
  
    db.query "" {
      where = `$var.api1.response.result.id` == $db.ENDERECO.cliente_id
      return = {type: "list"}
      output = [
        "id"
        "created_at"
        "cliente_id"
        "tipoendereco_id"
        "logradouro"
        "numero"
        "complemento"
        "referencia"
      ]
    
      addon = [
        {name: "CEP", input: {CEP_id: $output.cep_id}, as: "_cep"}
      ]
    } as $ENDERECO1
  }

  response = {endereco1: $ENDERECO1}
}
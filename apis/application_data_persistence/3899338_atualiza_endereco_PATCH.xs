// atualiza endereco de um cliente
query atualizaEndereco verb=PATCH {
  api_group = "Application Data Persistence"

  input {
    int endereco_id? {
      table = ""
    }
  
    text logradouro? filters=trim
    text numero? filters=trim
    text complemento? filters=trim
    text referencia? filters=trim
    text cep? filters=trim
    text cidade? filters=trim
    text estado? filters=trim
    bool padrao?
    int cliente_id? {
      table = ""
    }
  }

  stack {
    api.request {
      url = "https://x8ki-letl-twmt.n7.xano.io/api:2S3qPpSF/upsertCEP"
      method = "POST"
      params = {
        cep   : $input.cep
        cidade: $input.cidade
        estado: $input.estado
      }
    
      headers = ["Content-Type: application/json"]
    } as $api1
  
    api.request {
      url = "https://x8ki-letl-twmt.n7.xano.io/api:2S3qPpSF/endereco/" ~$input.endereco_id
      method = "PATCH"
      params = {
        endereco_id: $input.endereco_id
        cliente_id : $input.cliente_id
        logradouro : $input.logradouro
        numero     : $input.numero
        complemento: $input.complemento
        referencia : $input.referencia
        cep_id     : $api1.response.result.id
        padrao     : $input.padrao
      }
    
      headers = ["Content-Type: application/json"]
    } as $api2
  }

  response = {
    logradouro : $api2.response.result.logradouro
    numero     : $api2.response.result.numero
    complemento: $api2.response.result.complemento
    referencia : $api2.response.result.referencia
    padrao     : $api2.response.result.padrao
    cliente_id : $api2.response.result.cliente_id
    cep        : {
      "cep_id": $var.api1.response.result.id,
      "cidade": $var.api1.response.result.cidade,
      "estado": $var.api1.response.result.estado
    }
  }
}
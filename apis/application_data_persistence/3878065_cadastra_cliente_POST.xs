query cadastraCliente verb=POST {
  api_group = "Application Data Persistence"

  input {
    text nome? filters=trim
    email email? filters=trim|lower
    password senha? {
      sensitive = true
      visibility = "internal"
    }
  
    text celular? filters=trim
    text cpf? filters=trim
    text status? filters=trim
  }

  stack {
    api.request {
      url = "https://x8ki-letl-twmt.n7.xano.io/api:22zA29C8/auth/signup"
      method = "POST"
      params = {
        name    : $input.nome
        email   : $input.email
        password: $input.senha
      }
    
      headers = ["Content-Type: application/json"]
    } as $api1
  
    api.request {
      url = "https://x8ki-letl-twmt.n7.xano.io/api:22zA29C8/auth/me"
      method = "GET"
      params = `$var.api1.response.result.authToken`
      headers = [
        "Authorization: Bearer " ~ $var.api1.response.result.authToken
        "Content-Type: application/json"
      ]
    
    } as $api2
  
    db.query "" {
      where = $input.status == $db.STATUS_CLIENTE.status
      return = {type: "list"}
    } as $STATUS_CLIENTE1
  
    db.add "" {
      enforce_hidden_fields = false
      data = {
        created_at       : "now"
        nome             : $input.nome
        celular          : $input.celular
        cpf              : $input.cpf
        status_cliente_id: $var.STATUS_CLIENTE1[0].id
        user_id          : `$var.api2.response.result.id`
      }
    } as $CLIENTE1
  }

  response = {
    user     : $api2.response.result
    cliente  : $CLIENTE1
    authToken: $api1.response.result.authToken
  }
}
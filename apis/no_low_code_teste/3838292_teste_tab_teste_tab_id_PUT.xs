// Update teste tab record
query "teste_tab/{teste_tab_id}" verb=PUT {
  api_group = "no low code TESTE"

  input {
    int teste_tab_id? filters=min:1
    dblink {
      table = ""
    }
  }

  stack {
    db.edit "" {
      field_name = "id"
      field_value = $input.teste_tab_id
      enforce_hidden_fields = false
      data = {
        email         : $input.email
        otp_code      : $input.otp_code
        otp_expires_at: $input.otp_expires_at
      }
    } as $model
  }

  response = $model
}
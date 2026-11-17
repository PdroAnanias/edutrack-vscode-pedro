// Add teste tab record
query teste_tab verb=POST {
  api_group = "no low code TESTE"

  input {
    dblink {
      table = ""
    }
  }

  stack {
    db.add "" {
      enforce_hidden_fields = false
      data = {
        created_at    : "now"
        email         : $input.email
        otp_code      : $input.otp_code
        otp_expires_at: $input.otp_expires_at
      }
    } as $model
  }

  response = $model
}
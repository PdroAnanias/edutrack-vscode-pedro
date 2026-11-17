// Add teste tab record
query enviar verb=POST {
  api_group = "no low code TESTE"

  input {
    text email? filters=trim
  }

  stack {
    security.create_password {
      character_count = 6
      require_lowercase = false
      require_uppercase = true
      require_digit = true
      require_symbol = false
      symbol_whitelist = ""
    } as $codigo_otp
  
    var $expiracao {
      value = now|add_secs_to_timestamp:300
    }
  
    db.add "" {
      enforce_hidden_fields = false
      data = {
        email         : $input.email
        otp_code      : $codigo_otp
        otp_expires_at: $expiracao
      }
    } as $teste_tab1
  
    var $pacote_email {
      value = {}|set:"otp":$teste_tab1.otp_code
    }
  
    function.run sendgrid_dynamic_send {
      input = {
        to_email   : $input.email
        template_id: "d-0ee3b8dcc758405b9442a4443b71b8c6"
        data       : $pacote_email
      }
    } as $func1
  }

  response = $teste_tab1
}
// Add teste tab record
query validar_otp verb=POST {
  api_group = "no low code TESTE"

  input {
    text email? filters=trim
    text cdg_digit? filters=trim
  }

  stack {
    db.get "" {
      field_name = "email"
      field_value = $input.email
    } as $teste_tab1
  
    precondition ($teste_tab1.otp_code == $input.cdg_digit) {
      error = "Código Errado"
    }
  }

  response = $teste_tab1
}
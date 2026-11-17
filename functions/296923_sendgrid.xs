function sendgrid {
  input {
    email to_email? filters=trim|lower
    text subject? filters=trim
    text body? filters=trim
  }

  stack {
  }

  response = null
}
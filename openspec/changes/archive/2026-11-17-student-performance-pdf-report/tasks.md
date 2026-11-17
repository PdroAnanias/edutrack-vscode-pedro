# Tasks

## 1. Python PDF Generator Script

- [x] 1.1 Criar o script Python `scripts/generate_performance_report.py` para compilar dados de disciplinas, tarefas e notas em um relatório PDF, incluindo tratamento de erros com `try/except` e retorno em JSON, verificando a criação do arquivo PDF via CLI.

## 2. Xano Download Endpoint

- [x] 2.1 Criar o grupo de API `Reports` em `apis/reports/api_group.xs` e o endpoint GET /reports/performance/download em `apis/reports/reports_performance_download_GET.xs` com autenticação obrigatória e filtro de segurança `user_id == $auth.id`, verificando a sintaxe XanoScript.

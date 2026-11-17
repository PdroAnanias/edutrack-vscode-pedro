# Tasks

## 1. Python Overdue Evaluation Logic

- [x] 1.1 Criar o script Python `scripts/filter_overdue_subjects.py` com lógica para identificar tarefas atrasadas e filtrar disciplinas com pendências, incluindo tratamento de erros com `try/except` e retorno em JSON, verificando a execução via CLI.

## 2. Search Endpoint Implementation

- [x] 2.1 Criar o endpoint GET /subjects/search em `apis/subjects/subjects_search_GET.xs` com parâmetros de busca por nome (`name`) ou filtro de tarefas atrasadas (`has_overdue`), verificando a restrição de acesso por `user_id == $auth.id`.

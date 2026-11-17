# Tasks

## 1. API Group Setup

- [x] 1.1 Criar a definição de grupo de API em `apis/subjects/api_group.xs` para o recurso Subjects, verificando a sintaxe XanoScript.

## 2. CRUD Endpoints Implementation

- [x] 2.1 Criar o endpoint POST /subjects em `apis/subjects/subjects_POST.xs` para criação de disciplina vinculada a `$auth.id`, verificando autenticação obrigatória.
- [x] 2.2 Criar o endpoint GET /subjects em `apis/subjects/subjects_GET.xs` para listagem de disciplinas com filtro `user_id == $auth.id`, verificando isolamento de dados.
- [x] 2.3 Criar o endpoint GET /subjects/{id} em `apis/subjects/subjects_id_GET.xs` para consulta por ID com filtro `user_id == $auth.id`, verificando proteção contra acesso não autorizado.
- [x] 2.4 Criar o endpoint PATCH /subjects/{id} em `apis/subjects/subjects_id_PATCH.xs` para atualização de disciplina com filtro `user_id == $auth.id`, verificando integridade do tenant.
- [x] 2.5 Criar o endpoint DELETE /subjects/{id} em `apis/subjects/subjects_id_DELETE.xs` para remoção de disciplina com filtro `user_id == $auth.id`, verificando isolamento na exclusão.

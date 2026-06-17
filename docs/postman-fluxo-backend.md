# Fluxo Postman pelo backend

Base local:

```text
http://127.0.0.1:8000
```

Autenticacao:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@sedu.se.gov.br",
  "senha": "sedu123"
}
```

Use o `token` retornado como:

```text
Authorization: Bearer {{admin_token}}
```

## 1. Cadastrar 3 questoes

```http
POST /questoes
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "enunciado": "Questao 1 - quanto e 1 + 1?",
  "serie": "1ª série EM",
  "materia": "Matematica Postman",
  "conteudo": "Fluxo Postman",
  "nivel": "Fácil",
  "status": "publicada",
  "alternativas": [
    { "texto": "2", "correta": true },
    { "texto": "1", "correta": false },
    { "texto": "3", "correta": false },
    { "texto": "4", "correta": false }
  ]
}
```

Repita com outros enunciados. Guarde os ids como `{{questao_1}}`, `{{questao_2}}`, `{{questao_3}}`.

Use `GET /etiquetas/series`, `GET /etiquetas/materias`, `GET /etiquetas/niveis`, `GET /etiquetas/conteudos?materia={{materia}}` e `GET /estrutura/turmas` para pegar valores existentes no banco.

## 2. Criar 1 prova

```http
POST /simulados
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "gestor_id": {{admin_usuario_id}},
  "turma_id": {{turma_id}},
  "titulo": "Prova Postman",
  "serie": "1ª série EM",
  "materia": "Matematica Postman",
  "conteudos": ["Fluxo Postman"],
  "quantidade": 3
}
```

Guarde o `id` como `{{simulado_id}}`.

## 3. Associar as 3 questoes a prova

```http
POST /simulados/{{simulado_id}}/questoes
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "questao_ids": [{{questao_1}}, {{questao_2}}, {{questao_3}}]
}
```

## 4. Criar um aluno

```http
POST /cadastro/aluno
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "nome": "Aluno Postman",
  "email": "aluno.postman@example.com",
  "senha": "sedu123",
  "cpf": "90000000001",
  "data_nascimento": "2011-05-10",
  "genero": "masculino",
  "etnia": "parda",
  "escolaridade": "fundamental_incompleto",
  "endereco": {
    "logradouro": "Rua Teste",
    "numero": "123",
    "bairro": "Centro",
    "municipio": "Vitoria",
    "uf": "ES",
    "cep": "29000-000"
  },
  "responsaveis": [
    { "parentesco": "mae", "nome": "Mae Postman" }
  ],
  "necessidade_suporte": {
    "necessita": false,
    "adaptacoes": [],
    "documentos_enviados": false
  },
  "vinculo": "escola",
  "turma_id": {{turma_id}}
}
```

Guarde `aluno.id` como `{{aluno_id}}` e o e-mail/senha para login do aluno.

## 5. Inscrever esse aluno na prova

```http
POST /simulados/{{simulado_id}}/inscricoes
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "aluno_id": {{aluno_id}}
}
```

## 6. Liberar e responder as 3 questoes

Liberar:

```http
POST /simulados/{{simulado_id}}/liberar
Authorization: Bearer {{admin_token}}
```

Login do aluno:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "aluno.postman@example.com",
  "senha": "sedu123"
}
```

Use o token do aluno:

```text
Authorization: Bearer {{aluno_token}}
```

Para ver questoes e alternativas sem gabarito:

```http
GET /simulados/{{simulado_id}}/questoes
Authorization: Bearer {{aluno_token}}
```

Para conferir gabarito em teste de Postman, use admin:

```http
GET /simulados/{{simulado_id}}/preview
Authorization: Bearer {{admin_token}}
```

Responder cada questao:

```http
POST /respostas
Authorization: Bearer {{aluno_token}}
Content-Type: application/json

{
  "aluno_id": {{aluno_id}},
  "simulado_id": {{simulado_id}},
  "questao_id": {{questao_id}},
  "alternativa_id": {{alternativa_id}}
}
```

## 7. Gerar resultado da prova

Resultado individual:

```http
GET /simulados/{{simulado_id}}/resultados/{{aluno_id}}
Authorization: Bearer {{admin_token}}
```

Finalizar e gerar agregado:

```http
POST /simulados/{{simulado_id}}/finalizar
Authorization: Bearer {{admin_token}}
```

As acoes desse fluxo ficam persistidas em `acoes_auditoria` e podem ser vistas em:

```http
GET /auditoria?por_pagina=20
Authorization: Bearer {{admin_token}}
```

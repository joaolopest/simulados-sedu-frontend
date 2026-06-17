# Fluxo Pelo Backend No Postman

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

Antes de montar o fluxo, consulte valores reais do banco:

```http
GET /etiquetas/series
GET /etiquetas/materias
GET /etiquetas/niveis
GET /etiquetas/conteudos?materia=Matemática
GET /estrutura/turmas
```

## 1. Cadastrar 3 Questoes

Exemplo usando etiquetas coerentes com o seed/importacao ENEM:

```http
POST /questoes
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "enunciado": "Uma turma arrecadou 48 caixas de alimentos e distribuiu igualmente entre 6 familias. Quantas caixas cada familia recebeu?",
  "serie": "1ª série EM",
  "materia": "Matemática",
  "conteudo": "ENEM - Matemática",
  "nivel": "Fácil",
  "status": "publicada",
  "alternativas": [
    { "texto": "6", "correta": false },
    { "texto": "8", "correta": true },
    { "texto": "12", "correta": false },
    { "texto": "48", "correta": false }
  ]
}
```

Repita com outros enunciados coerentes e guarde os ids como `{{questao_1}}`, `{{questao_2}}`, `{{questao_3}}`.

## 2. Criar 1 Prova

```http
POST /simulados
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "gestor_id": {{admin_usuario_id}},
  "turma_id": {{turma_id}},
  "titulo": "Avaliação diagnóstica - Matemática EM",
  "serie": "1ª série EM",
  "materia": "Matemática",
  "conteudos": ["ENEM - Matemática"],
  "quantidade": 3
}
```

Guarde o `id` como `{{simulado_id}}`.

## 3. Associar As 3 Questoes A Prova

```http
POST /simulados/{{simulado_id}}/questoes
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "questao_ids": [{{questao_1}}, {{questao_2}}, {{questao_3}}]
}
```

## 4. Criar Um Aluno

```http
POST /cadastro/aluno
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "nome": "Rafael Costa Almeida",
  "email": "rafael.almeida203@aluno.sedu.es.gov.br",
  "senha": "sedu123",
  "cpf": "90000000001",
  "data_nascimento": "2011-05-10",
  "genero": "masculino",
  "etnia": "parda",
  "escolaridade": "fundamental_incompleto",
  "endereco": {
    "logradouro": "Rua das Acacias",
    "numero": "123",
    "bairro": "Centro",
    "municipio": "Vitoria",
    "uf": "ES",
    "cep": "29000-000"
  },
  "responsaveis": [
    { "parentesco": "mae", "nome": "Mariana Costa Almeida" }
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

Guarde `aluno.id` como `{{aluno_id}}` e use e-mail/senha para login do aluno.

## 5. Inscrever O Aluno Na Prova

```http
POST /simulados/{{simulado_id}}/inscricoes
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "aluno_id": {{aluno_id}}
}
```

## 6. Liberar E Responder As 3 Questoes

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
  "email": "rafael.almeida203@aluno.sedu.es.gov.br",
  "senha": "sedu123"
}
```

Use o token do aluno:

```text
Authorization: Bearer {{aluno_token}}
```

Questoes e alternativas sem gabarito:

```http
GET /simulados/{{simulado_id}}/questoes
Authorization: Bearer {{aluno_token}}
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

## 7. Gerar Resultado Da Prova

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

As acoes desse fluxo ficam persistidas em `acoes_auditoria`:

```http
GET /auditoria?por_pagina=20
Authorization: Bearer {{admin_token}}
```

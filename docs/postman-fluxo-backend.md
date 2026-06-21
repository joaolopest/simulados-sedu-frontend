# Fluxo Completo Pelo Backend No Postman

Este guia testa o fluxo real da API:

1. cadastrar 3 questoes;
2. criar 1 prova;
3. associar as 3 questoes a prova;
4. criar 1 aluno;
5. inscrever o aluno na prova;
6. aluno responder as 3 questoes;
7. gerar e consultar resultado.

## Ambiente Do Postman

Crie um Environment no Postman com estas variaveis:

```text
base_url=http://127.0.0.1:8000
run={{$timestamp}}
admin_email=admin@sedu.se.gov.br
admin_senha=sedu123
turma_id=1
```

Para testar a producao na Vercel, troque apenas:

```text
base_url=https://simulados-sedu.vercel.app/_/backend
```

O `/_/backend` esta correto: e o prefixo publico do FastAPI dentro do deploy Vercel.

Em todas as requisicoes autenticadas, use:

```text
Authorization: Bearer {{admin_token}}
```

ou, para o aluno:

```text
Authorization: Bearer {{aluno_token}}
```

## 0. Login Admin

Metodo e URL:

```http
POST {{base_url}}/auth/login
```

Headers:

```text
Content-Type: application/json
```

Body:

```json
{
  "email": "{{admin_email}}",
  "senha": "{{admin_senha}}"
}
```

Tests:

```js
const json = pm.response.json();
pm.environment.set("admin_token", json.token);
pm.environment.set("admin_usuario_id", json.usuario.id);
```

## 1. Cadastrar Questao 1

Metodo e URL:

```http
POST {{base_url}}/questoes
```

Headers:

```text
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

Body:

```json
{
  "enunciado": "QA {{run}} - Questao 1: quanto e 2 + 2?",
  "serie": "9º ano",
  "materia": "Matemática",
  "conteudo": "QA Fluxo Completo {{run}}",
  "nivel": "Fácil",
  "status": "publicada",
  "tempo_estimado_segundos": 45,
  "competencias": ["Resolver problemas"],
  "alternativas": [
    { "texto": "4", "correta": true },
    { "texto": "5", "correta": false },
    { "texto": "6", "correta": false },
    { "texto": "7", "correta": false }
  ]
}
```

Tests:

```js
const json = pm.response.json();
pm.environment.set("questao_1", json.id);
pm.environment.set("questao_1_correta", json.alternativas.find(a => a.correta).id);
pm.environment.set("questao_1_errada", json.alternativas.find(a => !a.correta).id);
```

## 2. Cadastrar Questao 2

Metodo e URL:

```http
POST {{base_url}}/questoes
```

Headers:

```text
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

Body:

```json
{
  "enunciado": "QA {{run}} - Questao 2: quanto e 3 + 3?",
  "serie": "9º ano",
  "materia": "Matemática",
  "conteudo": "QA Fluxo Completo {{run}}",
  "nivel": "Fácil",
  "status": "publicada",
  "tempo_estimado_segundos": 45,
  "competencias": ["Resolver problemas"],
  "alternativas": [
    { "texto": "6", "correta": true },
    { "texto": "7", "correta": false },
    { "texto": "8", "correta": false },
    { "texto": "9", "correta": false }
  ]
}
```

Tests:

```js
const json = pm.response.json();
pm.environment.set("questao_2", json.id);
pm.environment.set("questao_2_correta", json.alternativas.find(a => a.correta).id);
pm.environment.set("questao_2_errada", json.alternativas.find(a => !a.correta).id);
```

## 3. Cadastrar Questao 3

Metodo e URL:

```http
POST {{base_url}}/questoes
```

Headers:

```text
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

Body:

```json
{
  "enunciado": "QA {{run}} - Questao 3: quanto e 4 + 4?",
  "serie": "9º ano",
  "materia": "Matemática",
  "conteudo": "QA Fluxo Completo {{run}}",
  "nivel": "Médio",
  "status": "publicada",
  "tempo_estimado_segundos": 45,
  "competencias": ["Resolver problemas"],
  "alternativas": [
    { "texto": "8", "correta": true },
    { "texto": "9", "correta": false },
    { "texto": "10", "correta": false },
    { "texto": "11", "correta": false }
  ]
}
```

Tests:

```js
const json = pm.response.json();
pm.environment.set("questao_3", json.id);
pm.environment.set("questao_3_correta", json.alternativas.find(a => a.correta).id);
pm.environment.set("questao_3_errada", json.alternativas.find(a => !a.correta).id);
```

## 4. Criar 1 Prova Em Rascunho

Metodo e URL:

```http
POST {{base_url}}/gestor/simulados
```

Headers:

```text
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

Body:

```json
{
  "nome": "Prova QA Completa {{run}}",
  "turmaId": "{{turma_id}}",
  "serie": "9_fundamental",
  "materias": ["matematica"],
  "conteudos": ["QA Fluxo Completo {{run}}"],
  "quantidadeQuestoes": 3,
  "distribuicao": { "facil": 67, "medio": 33, "dificil": 0 },
  "adaptacoesAceitas": [],
  "tempoLimiteMinutos": 20
}
```

Tests:

```js
const json = pm.response.json();
pm.environment.set("simulado_id", json.id);
```

## 5. Associar As 3 Questoes A Prova

Metodo e URL:

```http
POST {{base_url}}/gestor/simulados/{{simulado_id}}/montar
```

Headers:

```text
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

Body:

```json
{
  "questaoIds": ["{{questao_1}}", "{{questao_2}}", "{{questao_3}}"]
}
```

Tests:

```js
const json = pm.response.json();
pm.test("prova tem 3 questoes", () => {
  pm.expect(json.totalQuestoes).to.eql(3);
});
```

## 6. Validar A Prova

Metodo e URL:

```http
GET {{base_url}}/gestor/simulados/{{simulado_id}}/validar
```

Headers:

```text
Authorization: Bearer {{admin_token}}
```

Tests:

```js
const json = pm.response.json();
pm.test("validacao ok", () => {
  pm.expect(json.ok).to.eql(true);
});
```

## 7. Criar Um Aluno

Metodo e URL:

```http
POST {{base_url}}/cadastro/aluno
```

Headers:

```text
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

Body:

```json
{
  "nome": "Aluno QA Fluxo {{run}}",
  "email": "qa.fluxo.{{run}}@aluno.sedu.es.gov.br",
  "senha": "sedu123",
  "cpf": "9{{run}}",
  "data_nascimento": "2011-05-10",
  "genero": "masculino",
  "etnia": "parda",
  "escolaridade": "fundamental_incompleto",
  "endereco": {
    "logradouro": "Rua de Teste QA",
    "numero": "100",
    "bairro": "Centro",
    "municipio": "Vitoria",
    "uf": "ES",
    "cep": "29000000"
  },
  "responsaveis": [
    { "parentesco": "mae", "nome": "Mae QA", "telefone": "27999990000" }
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

Tests:

```js
const json = pm.response.json();
pm.environment.set("aluno_id", json.aluno.id);
pm.environment.set("aluno_usuario_id", json.usuario.id);
pm.environment.set("aluno_email", json.usuario.email);
```

## 8. Inscrever O Aluno Na Prova

Metodo e URL:

```http
POST {{base_url}}/gestor/simulados/{{simulado_id}}/inscricoes/lote
```

Headers:

```text
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

Body:

```json
{
  "alunoIds": ["{{aluno_id}}"]
}
```

Tests:

```js
const json = pm.response.json();
pm.test("aluno inscrito", () => {
  pm.expect(json.inscritos.length).to.eql(1);
});
```

## 9. Liberar A Prova

Metodo e URL:

```http
POST {{base_url}}/gestor/simulados/{{simulado_id}}/liberar
```

Headers:

```text
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

Body:

```json
{}
```

Tests:

```js
const json = pm.response.json();
pm.environment.set("snapshot_id", json.snapshotId);
pm.test("prova liberada", () => {
  pm.expect(json.status).to.eql("liberado");
});
```

## 10. Login Do Aluno

Metodo e URL:

```http
POST {{base_url}}/auth/login
```

Headers:

```text
Content-Type: application/json
```

Body:

```json
{
  "email": "{{aluno_email}}",
  "senha": "sedu123"
}
```

Tests:

```js
const json = pm.response.json();
pm.environment.set("aluno_token", json.token);
```

## 11. Iniciar A Prova

Metodo e URL:

```http
POST {{base_url}}/aluno/simulado/{{simulado_id}}/iniciar
```

Headers:

```text
Authorization: Bearer {{aluno_token}}
Content-Type: application/json
```

Body:

```json
{}
```

Tests:

```js
const json = pm.response.json();
pm.environment.set("tentativa_id", json.tentativaId);
```

## 12. Buscar Questoes Da Prova

Metodo e URL:

```http
GET {{base_url}}/aluno/simulado/{{simulado_id}}
```

Headers:

```text
Authorization: Bearer {{aluno_token}}
```

Tests:

```js
const json = pm.response.json();
pm.test("aluno recebeu 3 questoes sem gabarito", () => {
  pm.expect(json.questoes.length).to.eql(3);
  pm.expect(json.questoes[0].alternativas[0]).to.not.have.property("correta");
});
```

## 13. Responder Questao 1 Corretamente

Metodo e URL:

```http
PATCH {{base_url}}/aluno/simulado/{{simulado_id}}/responder
```

Headers:

```text
Authorization: Bearer {{aluno_token}}
Content-Type: application/json
```

Body:

```json
{
  "questaoId": "{{questao_1}}",
  "alternativaId": "{{questao_1_correta}}",
  "tempoGastoSegundos": 12
}
```

## 14. Responder Questao 2 Errada

Metodo e URL:

```http
PATCH {{base_url}}/aluno/simulado/{{simulado_id}}/responder
```

Headers:

```text
Authorization: Bearer {{aluno_token}}
Content-Type: application/json
```

Body:

```json
{
  "questaoId": "{{questao_2}}",
  "alternativaId": "{{questao_2_errada}}",
  "tempoGastoSegundos": 13
}
```

## 15. Finalizar Prova Com A Questao 3 Em Branco

Metodo e URL:

```http
POST {{base_url}}/aluno/simulado/{{simulado_id}}/finalizar
```

Headers:

```text
Authorization: Bearer {{aluno_token}}
Content-Type: application/json
```

Body:

```json
{
  "respostas": [
    {
      "questaoId": "{{questao_1}}",
      "alternativaId": "{{questao_1_correta}}",
      "tempoGastoSegundos": 12
    },
    {
      "questaoId": "{{questao_2}}",
      "alternativaId": "{{questao_2_errada}}",
      "tempoGastoSegundos": 13
    },
    {
      "questaoId": "{{questao_3}}",
      "alternativaId": null,
      "tempoGastoSegundos": 14
    }
  ]
}
```

Tests:

```js
const json = pm.response.json();
pm.test("contagem correta", () => {
  pm.expect(json.acertos).to.eql(1);
  pm.expect(json.erros).to.eql(1);
  pm.expect(json.emBranco).to.eql(1);
  pm.expect(json.tempoTotalSegundos).to.eql(39);
});
```

## 16. Consultar Resultado Persistido

Metodo e URL:

```http
GET {{base_url}}/aluno/simulado/{{simulado_id}}/resultado
```

Headers:

```text
Authorization: Bearer {{aluno_token}}
```

Tests:

```js
const json = pm.response.json();
pm.test("resultado persistido", () => {
  pm.expect(json.resultado.acertos).to.eql(1);
  pm.expect(json.resultado.erros).to.eql(1);
  pm.expect(json.resultado.emBranco).to.eql(1);
});
```

## 17. Teste Negativo: Aluno Nao Pode Refazer Sem Reabertura

Metodo e URL:

```http
POST {{base_url}}/aluno/simulado/{{simulado_id}}/iniciar
```

Headers:

```text
Authorization: Bearer {{aluno_token}}
Content-Type: application/json
```

Body:

```json
{}
```

Resultado esperado:

```text
HTTP 409
```

Body esperado:

```json
{
  "codigo": "CONFLITO",
  "mensagem": "Este simulado ja foi finalizado. Peca nova liberacao para responder novamente."
}
```

## 18. Reabrir Tentativa Do Aluno

Metodo e URL:

```http
POST {{base_url}}/gestor/simulados/{{simulado_id}}/alunos/{{aluno_id}}/reabrir
```

Headers:

```text
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

Body:

```json
{
  "motivo": "Reabertura autorizada para teste supervisionado."
}
```

Resultado esperado:

```text
HTTP 200
```

Tests:

```js
const json = pm.response.json();
pm.environment.set("tentativa_reaberta_id", json.tentativaId);
pm.test("tentativa reaberta", () => {
  pm.expect(json.ok).to.eql(true);
  pm.expect(json.status).to.be.oneOf(["nao_iniciado", "reaberta"]);
});
```

Depois disso, o aluno pode iniciar novamente, mas a tentativa e o resultado anteriores continuam no historico do banco.

## Auditoria

Para conferir os rastros:

```http
GET {{base_url}}/auditoria?por_pagina=20
Authorization: Bearer {{admin_token}}
```

## Healthcheck

```http
GET {{base_url}}/health
```

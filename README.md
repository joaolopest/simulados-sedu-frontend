# Simulados SEDU

Plataforma web para criacao, aplicacao, acompanhamento e analise de simulados escolares. O projeto une um frontend Next.js, um backend FastAPI e banco PostgreSQL para gerenciar usuarios, escolas, turmas, questoes, provas, respostas, resultados, notificacoes e auditoria.

Producao: [https://simulados-sedu.vercel.app](https://simulados-sedu.vercel.app)

## Estado atual

- Frontend em Next.js 16 com App Router.
- Backend em FastAPI, publicado junto ao frontend na Vercel.
- Banco principal em Supabase/PostgreSQL.
- Postgres local via Docker para desenvolvimento, fallback e backup local.
- Rotas do frontend chamam `/api/*`; essas rotas funcionam como BFF e repassam para o backend Python.
- Backend em producao fica sob `/_/backend`.
- Mocks/MSW nao fazem parte do runtime da aplicacao.
- Recursos de IA atuais sao heuristicas locais no backend, sem chamada para OpenAI, Claude, Gemini ou outro provedor externo.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS v4, Radix/shadcn, lucide-react, next-themes |
| Estado e dados | TanStack Query, Zustand, Axios |
| Backend | FastAPI, SQLAlchemy 2, PyJWT |
| Banco | Supabase/PostgreSQL, Postgres local Docker |
| Deploy | Vercel `experimentalServices` |
| Qualidade | ESLint, TypeScript, script de QA final |
| IA atual | `heuristico-local-v1` no backend |

## Arquitetura

```text
Browser
  |
  | chama /api/*
  v
Next.js BFF
  |
  | backendFetch()
  v
FastAPI /_/backend
  |
  v
PostgreSQL (Supabase ou Docker local)
```

O frontend nao deve acessar o banco diretamente. As telas consomem rotas Next.js em `src/app/api`, e essas rotas chamam o backend FastAPI usando `src/lib/backend.ts`.

Em producao, o arquivo `vercel.json` publica:

- frontend em `/`;
- backend FastAPI em `/_/backend`;
- regiao `gru1`.

## Perfis

A aplicacao trabalha com os seguintes perfis:

- `admin`: acesso geral, usuarios, escolas, configuracoes, questoes, provas, auditoria e revisoes.
- `gestor`: gestao da escola, turmas, provas, alertas e questoes dentro do escopo da escola.
- `professor`: criacao de questoes, provas e acompanhamento pedagogico dentro do escopo permitido.
- `suporte`: acompanhamento de alunos com suporte/adaptacao, notas e apoio presencial.
- `aluno`: provas disponiveis, historico, respostas, resultado e notificacoes proprias.
- `candidato`: fluxo de aluno/candidato, incluindo dados proprios e recursos ligados a supletivo quando aplicavel.

As permissoes reais ficam no backend. O frontend apenas esconde ou mostra opcoes conforme o perfil.

## Funcionalidades principais

- Login JWT e rota `/auth/me`.
- Bloqueio de usuario inativo no login.
- Criacao, edicao, publicacao, arquivamento, exclusao e revisao de questoes.
- Banco de questoes com filtros, paginacao, metricas e exportacao.
- Criacao de provas manuais, automaticas e por montagem de questoes.
- Associacao de questoes a provas.
- Inscricao de alunos em provas.
- Inicio, autosave de respostas e finalizacao de provas.
- Bloqueio de nova tentativa apos finalizar, com reabertura controlada.
- Resultado persistido com nota, acertos, erros, brancos e tempo.
- Historico do aluno.
- Dashboards de admin, gestor, professor, suporte e aluno.
- Notificacoes persistidas em banco.
- Auditoria persistida em banco.
- Configuracoes globais de regras de prova.
- Endpoints documentados no Swagger/OpenAPI.

## Documentacao tecnica de IA

Esta secao registra o estado real da aplicacao em relacao a IA. Ela foi escrita a partir do codigo atual do backend, frontend, dependencias e rotas de API.

### Estado atual das APIs de IA

No estado atual, o projeto nao usa APIs externas de IA em runtime.

Nao existem dependencias, SDKs ou chamadas diretas para provedores como:

- OpenAI;
- Anthropic/Claude;
- Gemini/Google AI;
- Hugging Face;
- Azure OpenAI;
- Ollama;
- LangChain.

O que existe hoje e uma camada interna de IA controlada no backend, implementada por regras e heuristicas locais.

Identificador do mecanismo atual:

```text
heuristico-local-v1
```

Arquivo principal:

```text
backend/app/services/ia_controlada_service.py
```

Rotas principais:

```text
backend/app/api/routers/ia.py
```

### Observacao sobre textos de apresentacao

Alguns textos de interface/landing page podem citar Claude ou modelo generativo como parte da proposta de produto. Esses textos nao representam uma integracao ativa no runtime atual.

Para documentacao tecnica, considerar como verdade o seguinte:

```text
A aplicacao atualmente nao envia dados para provedores externos de IA.
Os recursos chamados de IA sao calculados localmente no backend por heuristicas.
```

### Contexto de uso da IA

A IA controlada aparece em dois contextos principais.

1. Apoio a criacao de questoes

Admin, gestor e professor podem solicitar rascunhos estruturados de questoes. O backend gera um ponto de partida com enunciado, alternativas, explicacao, competencias e alertas de validacao.

O rascunho nao e publicado automaticamente. Ele deve ser revisado por humano e salvo como `rascunho`.

2. Apoio ao plano de reforco do aluno

O backend analisa respostas reais do aluno armazenadas no banco. A partir de questoes erradas ou em branco, o sistema identifica conteudos e competencias prioritarias e retorna recomendacoes pedagogicas simples.

Esse plano tambem exige validacao humana antes de ser aplicado como orientacao pedagogica.

### Endpoints de IA

As rotas diretas do backend usam o prefixo:

```text
/ia
```

Em producao na Vercel, o backend fica atras de:

```text
/_/backend
```

Portanto, uma rota direta de producao fica assim:

```text
https://simulados-sedu.vercel.app/_/backend/ia/questoes/rascunhos
```

O frontend chama as rotas BFF em:

```text
/api/ia
```

Essas rotas BFF repassam a requisicao para o backend FastAPI.

| Fluxo | Metodo e rota backend | Rota BFF frontend | Permissao |
| --- | --- | --- | --- |
| Gerar rascunhos de questoes | `POST /ia/questoes/rascunhos` | `POST /api/ia/questoes/rascunhos` | admin, gestor, professor |
| Salvar rascunho gerado | `POST /ia/questoes/rascunhos/salvar` | `POST /api/ia/questoes/rascunhos/salvar` | admin, gestor, professor |
| Plano de reforco do aluno | `GET /ia/alunos/{aluno_id}/plano-reforco` | `GET /api/ia/alunos/{id}/plano-reforco` | admin, proprio aluno, gestor/professor/suporte da mesma escola |

### Entrada para geracao de rascunhos

O endpoint de rascunhos recebe um JSON flexivel com parametros pedagogicos:

```json
{
  "quantidade": 3,
  "serie": "9_fundamental",
  "materia": "matematica",
  "conteudo": "equacoes do primeiro grau",
  "nivel": "medio",
  "competencias": ["resolver problemas com equacoes"],
  "adaptacoes": ["leitura_simplificada"],
  "habilidade": "resolver equacoes simples em situacoes-problema"
}
```

Regras atuais:

- `quantidade` e limitada entre 1 e 10;
- se `quantidade` vier invalida, o padrao e 3;
- serie, materia e nivel sao normalizados por `dominio_labels`;
- competencias e adaptacoes sao tratadas como listas;
- se nao houver habilidade, o sistema usa competencia, conteudo, materia ou um texto padrao.

### Saida da geracao de rascunhos

O retorno inclui:

- modo usado;
- data/hora da geracao;
- politica de publicacao;
- indicacao de revisao humana obrigatoria;
- lista de rascunhos;
- alertas de guardrail;
- percentual simples de confianca.

Exemplo de formato:

```json
{
  "modo": "heuristico-local-v1",
  "geradoEm": "2026-06-23T00:00:00+00:00",
  "revisaoHumanaObrigatoria": true,
  "politicaPublicacao": "IA nunca publica automaticamente; salve como rascunho e publique apos revisao.",
  "rascunhos": []
}
```

### Templates que sustentam a geracao

Nao existe prompt de sistema de LLM externo no runtime atual.

O que existe sao templates locais fixos no backend.

Template de enunciado:

```text
Em uma situacao-problema de {conteudo ou materia}, avalie {foco} e selecione a alternativa mais adequada. Item {indice}.
```

Template de explicacao:

```text
Rascunho gerado para revisao humana. Ajuste contexto, gabarito e distratores antes de publicar.
```

Templates de alternativas:

```text
Resposta correta a ser revisada pelo professor.
Distrator plausivel relacionado ao erro conceitual 1.
Distrator plausivel relacionado ao erro conceitual 2.
Distrator plausivel relacionado ao erro de leitura.
```

Politica de publicacao retornada pela API:

```text
IA nunca publica automaticamente; salve como rascunho e publique apos revisao.
```

### Guardrails e agente de validacao

O backend possui uma funcao local de validacao de rascunhos. Ela atua como um agente de validacao simples antes do rascunho ser retornado ou salvo.

Funcao:

```text
_guardrails_rascunho
```

Validacoes atuais:

- enunciado com menos de 30 caracteres;
- menos de 4 alternativas;
- quantidade de alternativas corretas diferente de 1;
- conteudo ausente.

Codigos de alerta:

```text
enunciado_curto
poucas_alternativas
gabarito_invalido
conteudo_ausente
```

Mensagens retornadas:

```text
Revise o enunciado.
Use ao menos 4 alternativas.
Marque exatamente 1 alternativa correta.
Informe o conteudo.
```

Regra de confianca:

- se houver alertas, a confianca retornada e `58`;
- se nao houver alertas, a confianca retornada e `72`.

Essa confianca nao vem de modelo estatistico externo. Ela e uma heuristica simples para sinalizar qualidade inicial do rascunho.

### Salvamento de rascunho gerado por IA

O endpoint:

```text
POST /ia/questoes/rascunhos/salvar
```

salva o rascunho como uma questao real no banco.

Comportamentos importantes:

- cria a questao usando o servico real de questoes;
- salva alternativas em tabela propria;
- define o status como `rascunho`;
- grava competencias;
- grava explicacao;
- grava tempo estimado;
- vincula o autor em `criado_por_id`;
- se o usuario nao for admin, vincula a questao a escola do usuario;
- registra auditoria.

O retorno confirma:

```json
{
  "questao": {},
  "revisaoHumanaObrigatoria": true,
  "status": "rascunho"
}
```

### Plano de reforco do aluno

O endpoint:

```text
GET /ia/alunos/{aluno_id}/plano-reforco
```

usa dados reais do banco para montar uma recomendacao pedagogica.

Dados analisados:

- respostas do aluno;
- respostas com status `errada`;
- respostas com status `em_branco`;
- conteudo da questao;
- competencias da questao;
- ultimos resultados persistidos em `ResultadoSimulado`.

O backend calcula:

- media recente do aluno;
- conteudos prioritarios por recorrencia de erro/branco;
- competencias prioritarias por recorrencia;
- recomendacoes de estudo.

Template de recomendacao por conteudo:

```text
Revisar {conteudo} com exercicios graduais.
```

Recomendacao fallback:

```text
Manter rotina de revisao e resolver itens de nivel progressivo.
```

Observacao retornada pela API:

```text
Plano calculado por heuristicas locais; professor/suporte deve validar antes de aplicar.
```

### Regras de acesso ao plano de reforco

O acesso ao plano de reforco e validado no backend.

Regras atuais:

- admin acessa qualquer aluno;
- aluno acessa apenas o proprio registro;
- gestor, professor e suporte acessam somente alunos da mesma escola;
- qualquer usuario fora do escopo recebe erro 403.

### Auditoria dos fluxos de IA

As acoes de IA geram eventos persistidos na auditoria.

Eventos atuais:

```text
gerar_rascunhos_ia
salvar_rascunho_ia
gerar_plano_reforco_ia
```

Cada evento registra, conforme o fluxo:

- usuario executor;
- tipo da acao;
- tipo do alvo;
- ID do alvo quando existir;
- detalhes;
- dados do request disponiveis para auditoria.

### Dados enviados para provedores externos

Nenhum dado e enviado para provedores externos de IA no estado atual.

Isso inclui:

- dados de aluno;
- respostas;
- resultados;
- questoes;
- escolas;
- turmas;
- credenciais;
- dados sensiveis.

Todos os calculos de IA controlada ocorrem dentro do backend da aplicacao.

### Limites atuais da IA

A IA atual nao e generativa de verdade. Ela nao consulta um modelo externo e nao possui raciocinio semantico profundo.

Limites conhecidos:

- rascunhos sao templates pedagogicos iniciais;
- alternativas sao placeholders revisaveis;
- confianca e uma heuristica fixa;
- plano de reforco e baseado em frequencia de erros/brancos;
- nao ha correcao automatica de questoes discursivas;
- nao ha geracao por matriz complexa, BNCC completa ou modelo LLM externo;
- nao ha publicacao automatica.

### Como documentar futuras APIs externas de IA

Se futuramente o projeto integrar OpenAI, Claude, Gemini ou outro provedor, esta documentacao deve ser atualizada com:

- provedor usado;
- modelo usado;
- endpoint externo;
- SDK/dependencia adicionada;
- variaveis de ambiente;
- dados enviados;
- dados retornados;
- prompts de sistema;
- templates de usuario;
- regras de sanitizacao;
- politica de retencao;
- custo/limites;
- fallback em caso de erro;
- auditoria;
- revisao humana obrigatoria.

## Banco de dados

O banco principal esperado em producao e Supabase/PostgreSQL via `DATABASE_URL`.

A aplicacao tambem pode rodar com Postgres local Docker. O fallback SQLite foi removido porque o sistema precisa de persistencia relacional compativel com o ambiente real.

Ordem usada pelo backend:

1. `DATABASE_URL` no ambiente;
2. `.env` na raiz;
3. `backend/.env`;
4. Postgres local em `localhost:5432`.

Variaveis importantes:

```env
DATABASE_URL=postgresql://...
SEDU_JWT_SECRET=...
BACKEND_URL=http://127.0.0.1:8000
CORS_ORIGINS=https://simulados-sedu.vercel.app,http://localhost:3000
```

Nunca commitar `.env`, `backend/.env` ou credenciais do Supabase.

## Como rodar localmente

### Opcao recomendada no Windows

```powershell
pnpm install
.\scripts\start-app.ps1
```

O script tenta usar Supabase quando `DATABASE_URL` esta configurado e acessivel. Se nao houver `DATABASE_URL` ou o Supabase nao responder, ele sobe o Postgres local via Docker.

Aplicacao:

```text
http://localhost:3000
```

Backend local:

```text
http://localhost:8000
```

Swagger local:

```text
http://localhost:8000/docs
```

### Rodar com Docker

Usando Supabase:

```powershell
docker compose up --build backend frontend
```

Usando Postgres local Docker:

```powershell
docker compose --profile local-db up --build
```

### Rodar frontend e backend separados

Backend:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.api.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
pnpm install
$env:BACKEND_URL="http://127.0.0.1:8000"
pnpm run dev
```

## API e Postman

Swagger local:

```text
http://localhost:8000/docs
```

Swagger em producao:

```text
https://simulados-sedu.vercel.app/_/backend/docs
```

Fluxo documentado para Postman:

```text
docs/postman-fluxo-backend.md
```

Fluxo principal coberto:

1. cadastrar 3 questoes;
2. cadastrar 1 prova;
3. associar as 3 questoes a prova;
4. criar 1 aluno;
5. inscrever o aluno na prova;
6. aluno responder as 3 questoes;
7. gerar resultado da prova.

## Scripts

```powershell
pnpm run dev
pnpm run build
pnpm run start
pnpm run lint
pnpm run qa:final
```

O script `qa:final` verifica TypeScript, lint, build, OpenAPI, rotas essenciais, collection Postman local e ausencia de mocks/MSW/fila local no runtime.

Mais detalhes:

```text
docs/qa-final.md
```

## Deploy

O deploy de producao roda na Vercel.

Configuracao atual:

- projeto: `simulados-sedu`;
- dominio: `https://simulados-sedu.vercel.app`;
- frontend: `/`;
- backend: `/_/backend`;
- regiao: `gru1`;
- banco: Supabase/PostgreSQL via `DATABASE_URL`.

Variaveis obrigatorias na Vercel:

```text
DATABASE_URL
SEDU_JWT_SECRET
```

Variavel opcional:

```text
CORS_ORIGINS
```

## Documentacao complementar

- `docs/postman-fluxo-backend.md`: guia do fluxo principal via Postman.
- `docs/qa-final.md`: verificacao final local.
- `docs/mapeamento-dados-backend.md`: mapeamento de dados vindos do backend/banco.
- `docs/analise-boas-praticas.md`: pontos de qualidade, riscos e melhorias tecnicas.

## Observacoes importantes

- Nao commitar secrets, `.env`, `backend/.env`, dumps ou arquivos locais de teste.
- O frontend deve continuar chamando `/api/*`, e nao diretamente o Supabase.
- O backend e a fonte real de permissao e escopo dos dados.
- Mocks antigos nao devem voltar para o runtime.
- Planos, testes locais e materiais temporarios so devem entrar no Git quando forem explicitamente aprovados.

## Licenca

MIT.

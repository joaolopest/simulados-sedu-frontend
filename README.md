# Simulados SEDU

Plataforma web para criação, aplicação, acompanhamento e análise de simulados escolares. O projeto combina frontend em Next.js, backend em FastAPI e banco PostgreSQL para gerenciar usuários, escolas, turmas, questões, provas, respostas, resultados, notificações e auditoria.

Produção: [https://simulados-sedu.vercel.app](https://simulados-sedu.vercel.app)

## Estado Atual

- Frontend em Next.js 16 com App Router.
- Backend em FastAPI, publicado junto ao frontend na Vercel.
- Banco principal em Supabase/PostgreSQL.
- Postgres local via Docker para desenvolvimento, fallback e backup local.
- As telas chamam rotas `/api/*` do Next.js; essas rotas funcionam como BFF e repassam as chamadas para o backend Python.
- Em produção, o backend fica exposto sob `/_/backend`.
- Mocks/MSW não fazem parte do runtime da aplicação.
- Os recursos atuais chamados de IA são heurísticas locais no backend, sem chamada para OpenAI, Claude, Gemini ou outro provedor externo.

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

O frontend não deve acessar o banco diretamente. As telas consomem rotas Next.js em `src/app/api`, e essas rotas chamam o backend FastAPI usando `src/lib/backend.ts`.

Em produção, o arquivo `vercel.json` publica:

- frontend em `/`;
- backend FastAPI em `/_/backend`;
- região `gru1`.

## Perfis

A aplicação trabalha com os seguintes perfis:

- `admin`: acesso geral a usuários, escolas, configurações, questões, provas, auditoria e revisões.
- `gestor`: gestão da escola, turmas, provas, alertas e questões dentro do escopo da escola.
- `professor`: criação de questões, provas e acompanhamento pedagógico dentro do escopo permitido.
- `suporte`: acompanhamento de alunos com suporte/adaptação, notas e apoio presencial.
- `aluno`: provas disponíveis, histórico, respostas, resultado e notificações próprias.
- `candidato`: fluxo de aluno/candidato, incluindo dados próprios e recursos ligados ao supletivo quando aplicável.

As permissões reais ficam no backend. O frontend apenas esconde ou mostra opções conforme o perfil.

## Funcionalidades Principais

- Login JWT e rota `/auth/me`.
- Bloqueio de usuário inativo no login.
- Criação, edição, publicação, arquivamento, exclusão e revisão de questões.
- Banco de questões com filtros, paginação, métricas e exportação.
- Criação de provas manuais, automáticas, híbridas e por montagem de questões.
- Associação de questões a provas.
- Inscrição de alunos em provas.
- Início, autosave de respostas e finalização de provas.
- Bloqueio de nova tentativa após finalizar, com reabertura controlada.
- Resultado persistido com nota, acertos, erros, brancos e tempo.
- Histórico do aluno.
- Dashboards de admin, gestor, professor, suporte e aluno.
- Notificações persistidas no banco.
- Auditoria persistida no banco.
- Configurações globais de regras de prova.
- Endpoints documentados no Swagger/OpenAPI.

## Documentação Técnica de IA

Esta seção registra o estado real da aplicação em relação à IA. Ela foi escrita a partir do código atual do backend, frontend, dependências e rotas de API.

### Estado Atual das APIs de IA

No estado atual, o projeto não usa APIs externas de IA em runtime.

Não existem dependências, SDKs ou chamadas diretas para provedores como:

- OpenAI;
- Anthropic/Claude;
- Gemini/Google AI;
- Hugging Face;
- Azure OpenAI;
- Ollama;
- LangChain.

O que existe hoje é uma camada interna de IA controlada no backend, implementada por regras e heurísticas locais.

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

### Observação Sobre Textos de Apresentação

Alguns textos de interface ou landing page podem citar Claude ou modelo generativo como parte da proposta de produto. Esses textos não representam uma integração ativa no runtime atual.

Para documentação técnica, considerar como verdade:

```text
A aplicação atualmente não envia dados para provedores externos de IA.
Os recursos chamados de IA são calculados localmente no backend por heurísticas.
```

### Contexto de Uso da IA

A IA controlada aparece em dois contextos principais.

1. Apoio à criação de questões

Admin, gestor e professor podem solicitar rascunhos estruturados de questões. O backend gera um ponto de partida com enunciado, alternativas, explicação, competências e alertas de validação.

O rascunho não é publicado automaticamente. Ele deve ser revisado por uma pessoa e salvo como `rascunho`.

2. Apoio ao plano de reforço do aluno

O backend analisa respostas reais do aluno armazenadas no banco. A partir de questões erradas ou em branco, o sistema identifica conteúdos e competências prioritárias e retorna recomendações pedagógicas simples.

Esse plano também exige validação humana antes de ser aplicado como orientação pedagógica.

### Endpoints de IA

As rotas diretas do backend usam o prefixo:

```text
/ia
```

Em produção na Vercel, o backend fica atrás de:

```text
/_/backend
```

Portanto, uma rota direta de produção fica assim:

```text
https://simulados-sedu.vercel.app/_/backend/ia/questoes/rascunhos
```

O frontend chama as rotas BFF em:

```text
/api/ia
```

Essas rotas BFF repassam a requisição para o backend FastAPI.

| Fluxo | Método e rota backend | Rota BFF frontend | Permissão |
| --- | --- | --- | --- |
| Gerar rascunhos de questões | `POST /ia/questoes/rascunhos` | `POST /api/ia/questoes/rascunhos` | admin, gestor, professor |
| Salvar rascunho gerado | `POST /ia/questoes/rascunhos/salvar` | `POST /api/ia/questoes/rascunhos/salvar` | admin, gestor, professor |
| Plano de reforço do aluno | `GET /ia/alunos/{aluno_id}/plano-reforco` | `GET /api/ia/alunos/{id}/plano-reforco` | admin, próprio aluno, gestor/professor/suporte da mesma escola |

### Entrada Para Geração de Rascunhos

O endpoint de rascunhos recebe um JSON flexível com parâmetros pedagógicos:

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

- `quantidade` é limitada entre 1 e 10;
- se `quantidade` vier inválida, o padrão é 3;
- série, matéria e nível são normalizados por `dominio_labels`;
- competências e adaptações são tratadas como listas;
- se não houver habilidade, o sistema usa competência, conteúdo, matéria ou um texto padrão.

### Saída da Geração de Rascunhos

O retorno inclui:

- modo usado;
- data/hora da geração;
- política de publicação;
- indicação de revisão humana obrigatória;
- lista de rascunhos;
- alertas de guardrail;
- percentual simples de confiança.

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

### Templates que Sustentam a Geração

Não existe prompt de sistema de LLM externo no runtime atual.

O que existe são templates locais fixos no backend.

Template de enunciado:

```text
Em uma situacao-problema de {conteudo ou materia}, avalie {foco} e selecione a alternativa mais adequada. Item {indice}.
```

Template de explicação:

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

Política de publicação retornada pela API:

```text
IA nunca publica automaticamente; salve como rascunho e publique apos revisao.
```

### Guardrails e Agente de Validação

O backend possui uma função local de validação de rascunhos. Ela atua como um agente de validação simples antes de o rascunho ser retornado ou salvo.

Função:

```text
_guardrails_rascunho
```

Validações atuais:

- enunciado com menos de 30 caracteres;
- menos de 4 alternativas;
- quantidade de alternativas corretas diferente de 1;
- conteúdo ausente.

Códigos de alerta:

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

Regra de confiança:

- se houver alertas, a confiança retornada é `58`;
- se não houver alertas, a confiança retornada é `72`.

Essa confiança não vem de modelo estatístico externo. Ela é uma heurística simples para sinalizar a qualidade inicial do rascunho.

### Salvamento de Rascunho Gerado por IA

O endpoint:

```text
POST /ia/questoes/rascunhos/salvar
```

salva o rascunho como uma questão real no banco.

Comportamentos importantes:

- cria a questão usando o serviço real de questões;
- salva alternativas em tabela própria;
- define o status como `rascunho`;
- grava competências;
- grava explicação;
- grava tempo estimado;
- vincula o autor em `criado_por_id`;
- se o usuário não for admin, vincula a questão à escola do usuário;
- registra auditoria.

O retorno confirma:

```json
{
  "questao": {},
  "revisaoHumanaObrigatoria": true,
  "status": "rascunho"
}
```

### Plano de Reforço do Aluno

O endpoint:

```text
GET /ia/alunos/{aluno_id}/plano-reforco
```

usa dados reais do banco para montar uma recomendação pedagógica.

Dados analisados:

- respostas do aluno;
- respostas em branco;
- respostas marcadas como incorretas pelo gabarito;
- conteúdo da questão;
- competências da questão;
- últimos resultados persistidos em `ResultadoSimulado`.

O backend calcula:

- média recente do aluno;
- conteúdos prioritários por recorrência de erro/branco;
- competências prioritárias por recorrência;
- recomendações de estudo.

Template de recomendação por conteúdo:

```text
Revisar {conteudo} com exercicios graduais.
```

Recomendação fallback:

```text
Manter rotina de revisao e resolver itens de nivel progressivo.
```

Observação retornada pela API:

```text
Plano calculado por heuristicas locais; professor/suporte deve validar antes de aplicar.
```

### Regras de Acesso ao Plano de Reforço

O acesso ao plano de reforço é validado no backend.

Regras atuais:

- admin acessa qualquer aluno;
- aluno acessa apenas o próprio registro;
- gestor, professor e suporte acessam somente alunos da mesma escola;
- qualquer usuário fora do escopo recebe erro 403.

### Auditoria dos Fluxos de IA

As ações de IA geram eventos persistidos na auditoria.

Eventos atuais:

```text
gerar_rascunhos_ia
salvar_rascunho_ia
gerar_plano_reforco_ia
```

Cada evento registra, conforme o fluxo:

- usuário executor;
- tipo da ação;
- tipo do alvo;
- ID do alvo quando existir;
- detalhes;
- dados do request disponíveis para auditoria.

### Dados Enviados Para Provedores Externos

Nenhum dado é enviado para provedores externos de IA no estado atual.

Isso inclui:

- dados de aluno;
- respostas;
- resultados;
- questões;
- escolas;
- turmas;
- credenciais;
- dados sensíveis.

Todos os cálculos de IA controlada ocorrem dentro do backend da aplicação.

### Limites Atuais da IA

A IA atual não é generativa de verdade. Ela não consulta um modelo externo e não possui raciocínio semântico profundo.

Limites conhecidos:

- rascunhos são templates pedagógicos iniciais;
- alternativas são placeholders revisáveis;
- confiança é uma heurística fixa;
- plano de reforço é baseado em frequência de erros/brancos;
- não há correção automática de questões discursivas;
- não há geração por matriz complexa, BNCC completa ou modelo LLM externo;
- não há publicação automática.

### Como Documentar Futuras APIs Externas de IA

Se futuramente o projeto integrar OpenAI, Claude, Gemini ou outro provedor, esta documentação deve ser atualizada com:

- provedor usado;
- modelo usado;
- endpoint externo;
- SDK/dependência adicionada;
- variáveis de ambiente;
- dados enviados;
- dados retornados;
- prompts de sistema;
- templates de usuário;
- regras de sanitização;
- política de retenção;
- custo/limites;
- fallback em caso de erro;
- auditoria;
- revisão humana obrigatória.

## Banco de Dados

O banco principal esperado em produção é Supabase/PostgreSQL via `DATABASE_URL`.

A aplicação também pode rodar com Postgres local Docker. O fallback SQLite foi removido porque o sistema precisa de persistência relacional compatível com o ambiente real.

Ordem usada pelo backend:

1. `DATABASE_URL` no ambiente;
2. `.env` na raiz;
3. `backend/.env`;
4. Postgres local em `localhost:5432`.

Variáveis importantes:

```env
DATABASE_URL=postgresql://...
SEDU_JWT_SECRET=...
BACKEND_URL=http://127.0.0.1:8000
CORS_ORIGINS=https://simulados-sedu.vercel.app,http://localhost:3000
```

Nunca commitar `.env`, `backend/.env` ou credenciais do Supabase.

## Como Rodar Localmente

### Opção Recomendada no Windows

```powershell
pnpm install
.\scripts\start-app.ps1
```

O script tenta usar Supabase quando `DATABASE_URL` está configurado e acessível. Se não houver `DATABASE_URL` ou o Supabase não responder, ele sobe o Postgres local via Docker.

Aplicação:

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

### Rodar Frontend e Backend Separados

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

Swagger em produção:

```text
https://simulados-sedu.vercel.app/_/backend/docs
```

Fluxo documentado para Postman:

```text
docs/postman-fluxo-backend.md
```

Fluxo principal coberto:

1. cadastrar 3 questões;
2. cadastrar 1 prova;
3. associar as 3 questões à prova;
4. criar 1 aluno;
5. inscrever o aluno na prova;
6. aluno responder às 3 questões;
7. gerar resultado da prova.

## Scripts

```powershell
pnpm run dev
pnpm run build
pnpm run start
pnpm run lint
pnpm run qa:final
```

O script `qa:final` verifica TypeScript, lint, build, OpenAPI, rotas essenciais, collection Postman local e ausência de mocks/MSW/fila local no runtime.

Mais detalhes:

```text
docs/qa-final.md
```

## Deploy

O deploy de produção roda na Vercel.

Configuração atual:

- projeto: `simulados-sedu`;
- domínio: `https://simulados-sedu.vercel.app`;
- frontend: `/`;
- backend: `/_/backend`;
- região: `gru1`;
- banco: Supabase/PostgreSQL via `DATABASE_URL`.

Variáveis obrigatórias na Vercel:

```text
DATABASE_URL
SEDU_JWT_SECRET
```

Variável opcional:

```text
CORS_ORIGINS
```

## Documentação Complementar

- `docs/postman-fluxo-backend.md`: guia do fluxo principal via Postman.
- `docs/qa-final.md`: verificação final local.
- `docs/mapeamento-dados-backend.md`: mapeamento de dados vindos do backend/banco.
- `docs/analise-boas-praticas.md`: pontos de qualidade, riscos e melhorias técnicas.

## Observações Importantes

- Não commitar secrets, `.env`, `backend/.env`, dumps ou arquivos locais de teste.
- O frontend deve continuar chamando `/api/*`, e não diretamente o Supabase.
- O backend é a fonte real de permissão e escopo dos dados.
- Mocks antigos não devem voltar para o runtime.
- Planos, testes locais e materiais temporários só devem entrar no Git quando forem explicitamente aprovados.

## Licença

MIT.

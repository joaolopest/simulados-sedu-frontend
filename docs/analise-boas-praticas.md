# Analise De Boas Praticas, Organizacao E Seguranca

Este documento registra a analise local feita apos a migracao para backend/banco real e a importacao do acervo ENEM.

## Estado Validado

- Frontend chama rotas Next `/api`, que funcionam como BFF e repassam para o backend FastAPI.
- Backend persiste em PostgreSQL, usando Supabase como principal e Postgres Docker local como fallback/backup.
- `backend/scripts/importar_enem_zip.py` importa o ZIP `enem-api-main.zip` sem extrair arquivos para o repositorio.
- Importacao ENEM esta idempotente por marcador em `questoes.competencias`: `enem:ano:questao:idioma`.
- Supabase e Docker local ficaram com 2.826 questoes no total, sendo 2.757 questoes ENEM unicas.
- Auditoria, usuarios e escolas nao tem residuos reais de `Demo`, `Postman`, `Auditoria Fluxo`, `Administrador SEDU` ou `SEDU-DEMO`.
- Busca runtime por `mock`, `mocks`, `MSW`, `NEXT_PUBLIC_USE_MOCKS`, `seed_from_mocks`, `export-mocks` e fila local nao encontrou dependencia runtime.

## Alteracoes Feitas

- Criado `backend/scripts/importar_enem_zip.py`.
- `backend/scripts/seed_demo.py` nao cria mais admin/codigos de escola com nomes aparentando demo.
- `backend/app/schema_migrations.py` normaliza nomes/codigos antigos de usuarios, auditoria, simulados e escolas.
- `docs/postman-fluxo-backend.md` passou a usar dados coerentes com o banco, sem criar `Aluno Postman`, `Prova Postman` ou etiquetas artificiais.
- `backend/README.md` documenta a importacao ENEM.
- `docs/mapeamento-dados-backend.md` registra o acervo ENEM no banco.

## Validacoes Executadas

- `python -m compileall backend\app backend\scripts`: passou.
- `npm exec tsc -- --noEmit`: passou.
- `GET /auditoria` apos login admin: HTTP 200, com nomes reais em `acoes_auditoria`.
- `npm run lint`: falhou em regras React Compiler/hooks ja existentes.
- `npm audit --audit-level=moderate`: nao concluiu por falha de certificado local ao acessar o registry npm.

## Pendencias De Lint

Erros principais:

- `react-hooks/set-state-in-effect`: paginas de questoes, usuarios, execucao de simulado, `toggle-tema`, `use-conexao-online`, `use-timer`.
- `react-hooks/purity`: `Date.now()` chamado durante render em paginas de aluno/gestor e no timer.
- `react-hooks/rules-of-hooks`: `useMemo` condicional em resultado de simulado do aluno.
- `react-hooks/refs`: leitura/escrita de refs durante render em `use-contador-animado` e `use-timer`.

Avisos principais:

- `react-hook-form.watch()` em componentes grandes.
- `<img>` em componentes que poderiam usar `next/image`.
- variaveis/imports nao usados pontuais.

## Organizacao Recomendada

Prioridade alta:

- Dividir `backend/app/api/routers/painel.py`, que concentra rotas de admin, gestor, aluno e suporte em um unico arquivo grande.
- Extrair regras de negocio de routers para services por area:
  - `painel_admin_service.py`
  - `painel_gestor_service.py`
  - `painel_aluno_service.py`
  - `suporte_service.py`
- Quebrar paginas grandes do frontend, principalmente:
  - `src/app/(gestor)/gestor/simulados/novo/page.tsx`
  - `src/app/(admin)/admin/usuarios/page.tsx`
  - `src/app/(gestor)/gestor/simulados/[id]/relatorio/page.tsx`
  - `src/app/(admin)/admin/escolas/page.tsx`
- Criar helper padrao para rotas BFF Next `src/app/api/**/route.ts`, reduzindo repeticao de `backendFetch`, token e tratamento de erro.
- Criar testes automatizados do fluxo: criar questoes, criar prova, associar questoes, criar aluno, inscrever, responder e gerar resultado.

Prioridade media:

- Criar schemas Pydantic de resposta para reduzir `dict` manual no backend.
- Migrar `schema_migrations.py` para Alembic quando o schema estabilizar.
- Separar seeds por dominio: `seed_estrutura`, `seed_usuarios`, `seed_questoes`, `seed_suporte`.
- Criar fixtures de dados pequenas para testes, sem depender do seed completo.

## Pontos De Seguranca

Nao foi executada a varredura formal completa do `codex-security`, porque o fluxo oficial exige autorizacao explicita para subagentes. A analise abaixo e uma revisao local objetiva.

Riscos a corrigir antes de producao:

- CORS esta aberto com `allow_origins=["*"]` em `backend/app/api/main.py`. Deve virar allowlist por ambiente.
- `SEDU_JWT_SECRET` tem fallback padrao em `backend/app/services/auth_service.py`. Em producao, o backend deve falhar ao iniciar se a chave nao estiver configurada.
- Token de reset de senha e retornado pela API em `POST /auth/recuperar-senha`. Isso e aceitavel para dev, mas em producao deve ir por e-mail e nunca voltar no JSON.
- Token de sessao e persistido em cookie criado por JavaScript e tambem em `localStorage` via Zustand. Para producao, preferir cookie HttpOnly/Secure/SameSite gerenciado pelo BFF.
- Nao ha rate limit visivel para login, recuperacao de senha e endpoints sensiveis.
- Senha padrao `sedu123` deve ficar restrita a ambiente de demonstracao/dev.
- Se tabelas publicas forem expostas pela Data API do Supabase, revisar grants e RLS. O changelog do Supabase informa que novas tabelas podem exigir grants explicitos para Data/GraphQL API; como esta aplicacao usa backend por conexao Postgres direta, isso afeta principalmente uso futuro via `supabase-js`/Data API.

Pontos positivos:

- Backend e a fonte de autorizacao; frontend apenas esconde/desabilita opcoes.
- Rotas principais usam Bearer token e dependencias de perfil.
- Questoes possuem escopo por perfil/escola/criador.
- Aluno/candidato tem rotas com ownership pelo token.
- Acoes relevantes gravam auditoria em banco.

## Melhorias Opcionais

Precisam de decisao antes de implementar:

- Cookie HttpOnly para sessao via BFF.
- Rate limiting por IP/usuario em login, reset de senha e respostas.
- RLS no Supabase se houver acesso direto via Data API.
- Historico dedicado de suporte em tabela propria, em vez de concatenar observacoes.
- Upload real de imagens para Supabase Storage.
- Testes end-to-end com Playwright para os seis perfis.
- Testes de API com uma colecao Postman/Newman ou pytest.
- Reduzir paginas grandes em componentes menores sem mudar visual.
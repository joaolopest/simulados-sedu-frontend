# Laudo Final — Sistema de Simulados Educacionais com IA (SEDUC-SE)

> Revisão multi-agente (8 dimensões, 77 achados, 52 confirmados/ajustados após verificação adversarial). Nota de saúde: **72/100**.

## 1. Visão geral e nota

**Nota de saúde: 72/100** (calibrada para MVP acadêmico de residência).

Este é um backend bem pensado para o estágio em que está. A intenção de arquitetura em camadas (API → Service → Repository → Model) é real e está bem aplicada no fluxo central — banco de questões, geração de prova e ciclo de vida do simulado funcionam ponta a ponta, com regra de negócio testável isolada do HTTP. Para apresentar a um mentor, isso já conta muito a seu favor.

O que segura a nota não são erros de concepção, e sim duas frentes concretas:

1. **Segurança/autorização**: a infraestrutura de autenticação foi construída (JWT, hash de senha forte, validação de perfil) mas **não protege quase nada** — só `/auth/me` exige token. Esse é o ponto que um avaliador percebe em minutos.
2. **Integração e duplicação**: o backend e o front oficial da equipe foram desenhados contra contratos incompatíveis, e o mesmo backend vive em dois repositórios sem fonte única de verdade.

Nenhum desses problemas quebra a demonstração do caminho feliz, mas todos cobram juros assim que entrar IA, relatórios, multi-matéria e a integração real com o front.

> **Calibragem honesta:** muita coisa funciona e está bem feita. A nota não é mais alta por causa de **um achado crítico de autorização** (que, em produção real, derrubaria a nota bem mais) e de **lacunas de prontidão** (sem testes, sem migrações, sem config por ambiente) que são esperadas num MVP, mas precisam estar no seu discurso como "próximos passos conhecidos".

---

## 2. Pontos fortes (o que defender com orgulho)

- **Camadas reais no fluxo principal.** `provas.py`, `simulados.py`, `respostas.py`, `importacao.py` não importam SQLAlchemy nem montam query — delegam aos services, que não conhecem FastAPI. A seta API→Service→Model está limpa nesse caminho.
- **Repository isolando a query mais complexa.** `questao_repository.py` concentra o filtro multi-critério com joins + `selectinload` (evita N+1) e é reaproveitado por `prova_service` e `simulado_service.trocar_questao` — exatamente o papel de um repositório.
- **Máquina de estados do simulado** (RASCUNHO→GERADO→LIBERADO→FINALIZADO) com guardas em cada transição (`simulado_service.py:43, 85, 144, 227`). Impede liberar antes de gerar, responder antes de liberar etc.
- **Modelagem de dados madura.** SQLAlchemy 2.x (`Mapped`/`mapped_column`), `UniqueConstraints` de negócio (`uq_resposta_unica`, `uq_simulado_questao`, `uq_conteudo_nome_materia`) e cascades corretos.
- **Segurança criptográfica bem feita.** PBKDF2-HMAC-SHA256 com 100k iterações + salt por usuário + `hmac.compare_digest`; JWT com `algorithms=["HS256"]` em allowlist e `exp` validado (`auth_service.py:16-44`).
- **Geração determinística por seed**, com embaralhamento que preserva o vínculo do gabarito (`prova_service.py:86,116`) — ótimo para auditoria.
- **Importação em lote robusta**: valida item a item, acumula erros por linha `{linha, motivo}` e só commita as válidas (`importacao_service.py:106-129`).
- **Acesso a dados 100% via ORM parametrizado** — sem f-string em query, sem `text()` cru, sem `eval/exec/subprocess`. Superfície de SQL injection efetivamente nula. `.env` e `*.db` fora do git.

---

## 3. Arquitetura — avaliação honesta

A direção das dependências está **correta no caminho central**, e isso é o mais difícil de acertar. O problema é de **consistência, não de concepção**.

**A regra "router/service não conhece ORM" vale só pela metade.** Existe um único repositório (`questao_repository.py`). Todo o resto do acesso a dados está espalhado:
- `etiquetas.py` e `auth.py:37` (login) consultam o ORM **direto do router**;
- `questao_service`, `importacao_service` e `simulado_service` montam `select(...)` inline;
- `demo.py` fala ORM e dá `sessao.commit()` dentro da camada de API.

Resultado: "router não conhece SQLAlchemy" é verdade em provas/simulados, mas falso em auth, etiquetas e demo. **(ARCH-2, severidade rebaixada para baixa — é dívida de organização, não bug.)**

**Dono da transação inconsistente (ARCH-3, baixa).** A maioria dos services commita internamente; `demo.py` também commita; `get_session` (`deps.py:8-13`) não faz rollback no except. Não há política única. Não há bug ativo hoje (o `close()` do SQLAlchemy descarta transação não-commitada), mas é uma decisão que precisa ser explícita antes de crescer. *Sugestão pragmática: routers NUNCA commitam; o service é dono da transação; adicionar rollback no except de `get_session` é um ganho barato.*

**Recomendação de arquitetura:** padronizar extraindo as queries que já existem para `etiqueta_repository`, `simulado_repository` e `usuario_repository.buscar_por_email`, mantendo o estilo de `questao_repository`. Não precisa ser elaborado — é mover, não reescrever.

---

## 4. Achados por severidade

### 4.1 CRÍTICO

**[SEC-1 / PROD-1] Endpoints sem autenticação/autorização**
`app/api/routers/simulados.py:42-148`, `questoes.py:69`, `importacao.py:39`, `respostas.py:18`, `demo.py`, `etiquetas.py`
Apenas `/auth/me` exige token; todos os demais usam só `Depends(get_session)`. Qualquer anônimo pode: importar/cadastrar questões, **gerar prova com gabarito exposto** (`/provas/gerar` retorna `gabarito_dict()`), criar/gerar/liberar/finalizar/apagar questões de simulados, e registrar resposta para qualquer `aluno_id`. Isso anula o modelo de perfis admin/gestor/aluno do backlog.
**Como corrigir:** mover `obter_usuario_atual` para `app/api/deps.py`; aplicar `dependencies=[Depends(obter_usuario_atual)]` nos routers; criar `require_perfil(...)` exigindo GESTOR/ADMIN nas escritas; em `/respostas`, derivar o aluno do token. Manter abertas só `/health` e `/auth/login`.

### 4.2 ALTO

**[SEC-3] JWT secret com fallback hardcoded** — `auth_service.py:11`
`CHAVE_SECRETA = os.environ.get("SEDU_JWT_SECRET", "troque-esta-chave-em-producao")`. Sem a env var, a app sobe com chave pública conhecida e qualquer um forja token de admin (HS256 é simétrico).
**Como corrigir:** lançar `RuntimeError` no import se a env var faltar (sem fallback); documentar `secrets.token_urlsafe(48)` no README; usar `.env` não versionado na demo.

**[SEC-2 / COR-8] Identidade (aluno_id) confiada vinda do corpo (IDOR)** — `respostas.py:11-27`
`ResponderRequest` recebe `aluno_id` arbitrário e grava a resposta sem checar se o requisitante é aquele aluno. Mesmo com SEC-1 resolvido, um aluno poderia falsificar nota de outro trocando o id no JSON.
**Como corrigir:** remover `aluno_id` do payload, resolver do token; validar que o aluno pertence à turma do simulado.

**[ARCH-4 / INT-7] Backend duplicado sem fonte única de verdade** — `seduc-questoes/app` vs `simulados-sedu-frontend/backend/app`
Conteúdo idêntico hoje (verificado: diferem só por CRLF/LF), mas sem `.gitattributes`, sem submodule, sem processo de sync. Com equipe de 7, divergência silenciosa é questão de tempo.
**Como corrigir:** eleger `seduc-questoes` como canônico; remover a cópia do front (consumir por URL/env) ou usar submodule/subtree; `.gitattributes` com `* text=auto eol=lf` nos dois repos.

**[ARCH-5 / API-8 / PROD-6] Contrato divergente do front oficial**
Backend: `id` int, nomes PT ("9º ano", "Matemática", "Fácil"), sem `/api`, sem paginação, token em header. Front (MSW): `id` string, códigos ("9_fundamental", "matematica", "facil"), envelope `{dados, meta}`, prefixo `/api`, token em cookie `sedu-token`. Quando desligarem os mocks, **nada encaixa**.
**Como corrigir:** fechar um contrato canônico (OpenAPI acordado), decidir vocabulário (recomendo código estável no fio + label PT só para exibição), padronizar envelope `{dados, meta}`, montar routers sob `APIRouter(prefix="/api")`.

**[TST-3] Auth, edição de simulado e correção sem nenhuma cobertura** — `auth_service.py`, `simulado_service.py:226-289`
As áreas de maior risco (hash/JWT, `remover_questao`, `trocar_questao`, branches de erro de `registrar_resposta`) não são exercitadas nem pelos scripts manuais. A validação existe, mas ninguém prova que dispara.

### 4.3 MÉDIO

- **[ARCH-1 / SEC-5] `/demo/preparar` sem auth** cria usuários (senha_hash="placeholder") e fala ORM no router (`demo.py:12-75`). Idempotente e sem credencial válida, mas é seed exposto na superfície pública. → mover para `scripts/` ou gate por `SEDU_DEMO=1`/ADMIN.
- **[DATA-2] FKs sem `ondelete` + SQLite sem `PRAGMA foreign_keys`** (`models.py:91-94,220-221,277-282`, `database.py:12`). Deletes podem deixar órfãos sem erro. → `ondelete` explícito + `event.listens_for(engine,"connect")` ligando o PRAGMA.
- **[DATA-3] Zero índices nas FKs filtradas** (`serie_id, materia_id, conteudo_id, nivel_id`). Invisível no SQLite, vira full scan no Postgres. → `index=True` + índice composto `(serie_id, materia_id)`.
- **[API-4] Mesmo `ValueError` mapeado para status HTTP inconsistente** (404 num router, 400 noutro para "não encontrado"). → exceções específicas (`NaoEncontradoError`/`RegraNegocioError`) + handler central.
- **[API-5] `GET /questoes` retorna lista crua sem paginação** — incompatível com `{dados, meta}` do front. → envelope + offset/page no repository (já tem `limite`).
- **[COR-1] Gabarito vira "?"/None com 6+ alternativas** (`prova_service.py:121-126`, `simulado_service.py:107-115`). O `zip(LETRAS, ...)` trunca na 5ª e a correta pode sumir. Hoje não há edição de questão, então é latente. → validar teto `len(LETRAS)` na importação/cadastro.
- **[COR-2] `montar_questoes` pula alternativa ausente em silêncio** (`continue`). A correção real usa `Resposta.correta` congelada, então a nota não corrompe; o risco fica no gabarito exibido. → levantar erro quando `incluir_gabarito and gabarito is None`.
- **[COR-3] `finalizar_e_corrigir` não valida status** (`simulado_service.py:185-216`) — dá para finalizar um RASCUNHO. → `if simulado.status != LIBERADO: raise ValueError(...)`.
- **[COR-4/COR-5] Distribuição por nível e quantidade degradam em silêncio** — `round()` pode distorcer a distribuição; menos candidatas que o pedido entrega prova menor sem avisar. `distribuicao_real` já existe como fonte de verdade. → validar soma ≈ 1 e chaves de nível existentes; decidir política de déficit.
- **[COR-6] `trocar_questao` ignora `adaptacoes` e nível** ao repor (`simulado_service.py:256-289`). → passar `adaptacoes` e preferir candidatas do mesmo nível.
- **[INT-6] Enum de status divergente** (backend "gerado" vs front "em_curadoria"; front tem 6 estados, back 4). → centralizar de/para no `_resumo`.
- **[PROD-2/3/7] Config hardcoded, sem Alembic, JSON genérico** — `database.py:10` fixa SQLite sem env; só `create_all`; `JSON` vira `json` (texto) no Postgres em vez de `jsonb`. → `pydantic-settings`, Alembic, `JSON().with_variant(JSONB,"postgresql")`.

### 4.4 BAIXO (registrar, não bloquear)

DATA-5 (enum persiste nome MAIÚSCULO), DATA-6 (`respondida_em` na verdade é `updated_at`), API-1 (criações retornam 200 em vez de 201), API-2 (sem `response_model`), API-3/API-6 (validação de input frouxa em `materia`/`distribuicao`), SEC-4 (CORS `*`), PROD-11 (README desatualizado descrevendo "Assunto/Dificuldade"), PROD-12 (usuários demo não logam).

> **Descartados na verificação adversarial:** INT-2, INT-4, INT-5 e PROD-5 foram **refutados** — os agentes que os geraram leram arquivos de front no caminho errado ou contaram CRLF como "divergência de conteúdo". O backend está PT-consistente com seu próprio cliente (`demo.html`), e as duas cópias do backend são byte-a-byte idênticas (só diferem em fim de linha). Cito aqui só para você saber que esses "achados alarmantes" não procedem.

---

## 5. Segurança (resumo focado)

A **base criptográfica está sólida** — o problema é **controle de acesso**, não cripto:

1. **Autorização ausente (crítico).** Tudo aberto exceto `/auth/me`.
2. **JWT secret com fallback público (alto).** Forja de admin se a env var faltar.
3. **Identidade vinda do corpo (alto).** IDOR em respostas e simulados.
4. **CORS `allow_origins=["*"]` (baixo hoje).** Inofensivo enquanto o token for Bearer em header e `allow_credentials=False`; vira risco quando migrar para cookie.
5. **XSS armazenado no `demo.html` via `innerHTML` (médio).** Como o cadastro é aberto, um `<img onerror=...>` injetado renderiza para quem abrir a raiz. Só afeta a página de demo, mas convém escapar com `textContent`.

O plano mínimo de hardening (itens 1–3) é barato e elimina o que o mentor vai apontar primeiro.

---

## 6. Integração com o front e os dois repositórios

Hoje **não existe integração real**: o repo `simulados-sedu-frontend` roda 100% em MSW/mocks, sem nenhuma URL apontando para a FastAPI. Os dois lados foram desenhados contra contratos incompatíveis em **todos** os eixos: id, vocabulário, envelope, prefixo `/api`, token. Quando ligarem `MSW=off`, praticamente toda chamada falha ou retorna vazio em silêncio.

O lado bom: a serialização é centralizada (`_serializar`, `_resumo`), então alinhar o contrato é **cirúrgico**, não espalhado — e os filtros dos dois lados cobrem as mesmas dimensões (mapeamento 1:1, falta só traduzir vocabulário).

**Ação recomendada antes de qualquer tela nova:** um *spike de integração* — subir a FastAPI, apontar um fluxo (listar questões) para o backend real, desligar o MSW desse fluxo e ver o que quebra. Isso transforma a lista de divergências de "teórica" em priorizada e te dá uma narrativa honesta para o mentor.

Sobre os **dois repositórios**: enquanto as cópias ainda são iguais, defina a fonte canônica e elimine a duplicação. É a hora mais barata de fazer isso.

---

## 7. Alinhamento ao backlog v4 (feito vs faltando)

**Entregue (MVP funcional):**
- FastAPI + SQLAlchemy 2.x ✅
- Banco de questões + etiquetas (série/matéria/conteúdo/nível) ✅
- Geração de prova balanceada e reprodutível ✅
- Ciclo de simulado com máquina de estados + correção/nota ✅
- Importação em lote com relatório ✅
- Auth (hash + JWT + `/login` + `/me`) ✅ *(mas não plugada)*

**Faltando:**
- **PostgreSQL 16** — hoje SQLite hardcoded, sem caminho por env.
- **Redis 7** — ausente (filas/cache).
- **IA de curadoria (Claude API)** — ausente; sem dependência `anthropic`.
- **Predição de evasão (scikit-learn)** — ausente.
- **Diagnóstico e relatórios de turma** — sem router, sem agregação por turma/conteúdo (hoje só agrega por aluno).
- **Migrações (Alembic)** — ausente.
- **Deploy (Dockerfile/lock)** — ausente; `requirements.txt` com faixas abertas e `debugpy` de dev.

**Boa notícia técnica:** o relatório de turma é o pré-requisito de dados para diagnóstico e predição, e **dá para derivá-lo de `Resposta` agregando por conteúdo/nível, sem IA**. Comece por ele.

---

## 8. Roadmap recomendado

**Curto prazo (antes da apresentação):**
1. Plugar auth em todos os endpoints + derivar identidade do token (SEC-1, SEC-2).
2. Fail-fast no JWT secret + `app/config.py` com pydantic-settings + `.env.example` (SEC-3, PROD-2).
3. Tirar `/demo/preparar` da superfície pública (gate por env ou ADMIN).
4. Endurecer bordas do gabarito (COR-1, COR-2, COR-3).

**Médio prazo (próximas fases):**
5. Fechar contrato canônico com o front + spike de integração (ARCH-5).
6. Fonte única do backend + `.gitattributes` (ARCH-4).
7. Alembic + pytest cobrindo auth, correção de nota e máquina de estados (PROD-3, TST-1, TST-3).
8. Migração para Postgres: índices nas FKs, `JSONB`, `ondelete`, conferir enums/timestamps com dump real (DATA-2, DATA-3, PROD-7).
9. Relatório de turma (derivado de `Resposta`) → depois IA e Redis, **uma fase de cada vez**.

---

## 9. O que dizer ao mentor

> "Construí um backend em camadas (API → Service → Repository → Model) com o fluxo central completo: banco de questões, geração de prova balanceada e reprodutível, e o ciclo de simulado com máquina de estados e correção. A modelagem usa SQLAlchemy 2.x com constraints de integridade, e o auth tem hash forte (PBKDF2) e JWT.
>
> Sei exatamente onde estão as lacunas e as tenho priorizadas: **a autenticação está construída mas ainda não protege os endpoints — esse é meu próximo passo número um.** Em seguida vêm o alinhamento de contrato com o front (que hoje roda em mocks), a unificação do backend que está duplicado em dois repos, e a entrada de Alembic e testes automatizados. A IA de curadoria, a predição de evasão e o Redis são fases posteriores; vou começar pelo relatório de turma, que dá para derivar dos dados de resposta sem IA e é o pré-requisito do diagnóstico."

Esse discurso é honesto, mostra domínio técnico e transforma cada fraqueza em um item de roadmap consciente — que é exatamente o que diferencia um líder de residência.

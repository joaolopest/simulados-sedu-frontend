# Plataforma De Avaliacao Estado-Da-Arte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir o Simulados SEDU de um sistema funcional para uma plataforma madura de avaliacao, gestao pedagogica, auditoria, diagnostico e automacao.

**Architecture:** Evolucao incremental sobre o backend FastAPI/PostgreSQL existente. As entregas devem preservar o frontend atual, manter testes/QA destrutivo fora do Git/deploy, e priorizar backend, integridade de dados e contratos API antes de redesenhos amplos.

**Tech Stack:** FastAPI, SQLAlchemy 2, PostgreSQL/Supabase, Next.js 16 App Router, Vercel services, Docker local fallback.

---

## File Structure

- `backend/app/services/diagnostico_service.py`: health operacional profundo e checks de integridade.
- `backend/app/api/main.py`: endpoints protegidos `/diagnostico` e `/diagnostico/reparar-snapshots`.
- `backend/app/services/metricas_questoes_service.py`: futura camada de metricas por questao.
- `backend/app/api/routers/questoes.py`: futura exposicao de metricas/qualidade.
- `backend/app/services/blueprint_prova_service.py`: futura validacao e geracao por blueprint.
- `backend/app/api/routers/painel.py`: futura integracao com geracao hibrida e dashboards.
- `src/app/(admin)/admin/configuracoes/page.tsx`: futura visualizacao de saude operacional.
- `src/app/(admin)/admin/questoes/page.tsx`: futura visualizacao de qualidade do banco.
- `docs/segunda-fase-plataforma-avaliacao.md`: documentacao permanente da fase 2, se o usuario quiser versionar.

---

### Task 1: Diagnostico Admin Profundo

**Files:**
- Create: `backend/app/services/diagnostico_service.py`
- Modify: `backend/app/api/main.py`
- Modify: `backend/app/services/prova_avancada_service.py`

- [ ] **Step 1: Criar service de diagnostico**

Criar `diagnostico_service.gerar_diagnostico(sessao)` retornando:

```python
{
    "status": "ok" | "atencao" | "critico",
    "checadoEm": "...",
    "ambiente": {"tipoBanco": "...", "dialeto": "...", "driver": "..."},
    "contagens": {"usuarios": 0, "alunos": 0, "questoes": 0},
    "configuracoes": {"obrigatorias": [...], "faltantes": [], "ok": True},
    "integridade": {
        "questoesSemAlternativasSuficientes": 0,
        "questoesComGabaritoInvalido": 0,
        "provasLiberadasSemSnapshot": 0,
        "tentativasFinalizadasSemResultado": 0,
        "resultadosInconsistentes": 0
    },
    "pendencias": {"criticas": [], "avisos": []},
    "recomendacoes": []
}
```

- [ ] **Step 2: Conectar endpoint existente**

Alterar `/diagnostico` em `backend/app/api/main.py` para:

```python
@app.get("/diagnostico", tags=["status"], dependencies=[Depends(so_admin)])
def diagnostico_admin(
    _usuario: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    """Diagnostico protegido da saude operacional e integridade do banco."""
    return diagnostico_service.gerar_diagnostico(sessao)
```

- [ ] **Step 3: Criar reparo controlado para snapshots legados**

Adicionar endpoint protegido:

```python
@app.post("/diagnostico/reparar-snapshots", tags=["status"], dependencies=[Depends(so_admin)])
def reparar_snapshots_admin(
    request: Request,
    usuario: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    resultado = diagnostico_service.reparar_snapshots_liberados(sessao, usuario)
    auditoria_service.registrar(...)
    sessao.commit()
    return resultado
```

O endpoint deve criar snapshots apenas para provas `liberado` sem snapshot e
deve retornar `totalReparados`, `totalIgnorados`, `reparados` e `ignorados`.

- [ ] **Step 4: Garantir snapshot no runtime**

Alterar `prova_avancada_service.obter_ou_criar_tentativa` e
`reabrir_para_aluno` para chamar `garantir_snapshot_liberado(...)`. Assim,
provas legadas nao quebram se um aluno iniciar antes do reparo manual.

- [ ] **Step 5: Validar localmente**

Run:

```powershell
backend\.venv\Scripts\python.exe -m compileall backend\app
pnpm run lint
pnpm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 6: Commit pelo usuario**

O agente nao deve executar commit. O usuario executa:

```powershell
git add backend/app/services/diagnostico_service.py backend/app/api/main.py backend/app/services/prova_avancada_service.py docs/superpowers/plans/2026-06-23-plataforma-avaliacao-estado-da-arte.md
git commit -m "feat: adiciona diagnostico operacional profundo"
git push origin main
```

---

### Task 2: Metricas De Qualidade Das Questoes

**Files:**
- Create: `backend/app/services/metricas_questoes_service.py`
- Modify: `backend/app/api/routers/questoes.py`
- Modify: `src/hooks/api/use-provas.ts` or `src/hooks/api/use-admin.ts`
- Modify: `src/app/(admin)/admin/questoes/page.tsx`

- [ ] **Step 1: Criar contrato de metricas**

Cada questao deve expor:

```json
{
  "questaoId": 123,
  "totalUsos": 8,
  "totalRespostas": 240,
  "taxaAcerto": 0.62,
  "taxaErro": 0.31,
  "taxaBranco": 0.07,
  "tempoMedioSegundos": 54,
  "usadaRecentemente": true,
  "alertas": ["baixa_taxa_acerto", "distrator_nunca_escolhido"]
}
```

- [ ] **Step 2: Implementar query agregada**

Usar `respostas`, `alternativas`, `simulado_questoes` e `questoes`. A query deve paginar por questao e nunca carregar tudo em memoria.

- [ ] **Step 3: Expor endpoint admin/gestor/professor**

Endpoint sugerido:

```http
GET /questoes/metricas?pagina=1&por_pagina=20&serie=...&materia=...
```

- [ ] **Step 4: Mostrar badges no banco de questoes**

Adicionar indicadores pequenos:

- baixa taxa de acerto;
- sem respostas ainda;
- usada recentemente;
- gabarito suspeito;
- tempo medio alto.

- [ ] **Step 5: Validar**

Run:

```powershell
pnpm run lint
pnpm run build
```

---

### Task 3: Blueprint De Prova Automatico/Hibrido

**Files:**
- Create: `backend/app/services/blueprint_prova_service.py`
- Modify: `backend/app/api/routers/painel.py`
- Modify: `src/app/(gestor)/gestor/simulados/novo/page.tsx`

- [ ] **Step 1: Definir shape do blueprint**

```json
{
  "totalQuestoes": 20,
  "tempoLimiteMinutos": 90,
  "distribuicaoDificuldade": {"facil": 40, "medio": 40, "dificil": 20},
  "conteudos": [{"conteudo": "Equacoes", "quantidade": 5}],
  "competencias": [{"nome": "Resolver problemas", "quantidade": 4}],
  "evitarUsadasRecentemente": true,
  "permitirSubstituicoes": true
}
```

- [ ] **Step 2: Validar blueprint antes de gerar**

Bloquear:

- quantidade abaixo do minimo global;
- quantidade acima do maximo global;
- distribuicao que nao fecha 100%;
- conteudo sem questoes suficientes;
- questao arquivada;
- gabarito invalido.

- [ ] **Step 3: Gerar sugestao editavel**

Retornar questoes sugeridas e faltas:

```json
{
  "ok": true,
  "questoes": [1, 2, 3],
  "faltas": [],
  "avisos": []
}
```

- [ ] **Step 4: Permitir modo hibrido**

O usuario aceita a sugestao, remove questoes e adiciona manualmente antes de salvar/liberar.

---

### Task 4: Observabilidade E Ambientes

**Files:**
- Modify: `backend/app/api/main.py`
- Create: `backend/app/services/observabilidade_service.py`
- Modify: `README.md`

- [ ] **Step 1: Padronizar request id**

Garantir `x-request-id` em todas as respostas e logs.

- [ ] **Step 2: Adicionar endpoint admin de latencia**

Expor latencia de banco e ultimos checks em `/diagnostico`.

- [ ] **Step 3: Documentar ambientes**

Documentar:

- local Docker;
- Supabase producao;
- Vercel producao;
- preview/staging futuro.

---

## Self-Review

Spec coverage:

- Base profissional: Task 1 and Task 4.
- Motor de provas automatico/hibrido: Task 3.
- Banco de questoes alto nivel: Task 2.
- QA local: deliberately not versioned here because the user requested local-only tests.
- IA, LGPD, dashboards avancados and integrations: planned for later tasks after data integrity and blueprint are stable.

Placeholder scan:

- No task says TBD/TODO. Larger phases are intentionally split into future task documents.

Type consistency:

- `diagnostico_service.gerar_diagnostico(sessao)` is the only function consumed by `main.py`.
- API shapes use camelCase for frontend-facing fields, matching current BFF style.

# Mapeamento de dados: frontend, backend e banco

Este mapeamento separa dados persistentes de constantes de interface. A regra atual da aplicacao e: dado de negocio vem do backend FastAPI e persiste em PostgreSQL (Supabase ou Docker local).

## Persistente em backend/banco

| Area | Frontend/BFF | Backend | Tabelas principais |
| --- | --- | --- | --- |
| Login e sessao | `src/app/api/auth/login/route.ts` | `POST /auth/login` | `usuarios`, `acoes_auditoria` |
| Auditoria | `src/app/api/admin/auditoria/route.ts` | `GET/POST /auditoria` | `acoes_auditoria` |
| Usuarios | `src/app/api/admin/usuarios/*` | `/usuarios` | `usuarios`, `alunos`, `acoes_auditoria` |
| Escolas e turmas | `src/app/api/admin/escolas/*`, `src/app/api/gestor/turmas/route.ts` | `/estrutura/*`, `/gestor/turmas` | `escolas`, `turmas`, `series`, `acoes_auditoria` |
| Questoes | `src/app/api/admin/questoes/*`, `src/app/api/questoes/*` | `/questoes` | `questoes`, `alternativas`, `revisoes_questao`, `notificacoes`, `acoes_auditoria` |
| Provas/simulados | `src/app/api/provas/*`, `src/app/api/gestor/simulados/*` | `/provas`, `/gestor/simulados`, `/simulados` | `simulados`, `simulado_questoes`, `simulado_inscricoes`, `respostas`, `acoes_auditoria` |
| Aluno | `src/app/api/aluno/*`, `src/app/api/simulados/*` | `/aluno/*`, `/simulados/*`, `/respostas` | `alunos`, `simulados`, `respostas`, `notificacoes`, `acoes_auditoria` |
| Suporte | `src/app/api/suporte/*` | `/suporte/*` | `alunos`, `usuarios`, `notificacoes`, `acoes_auditoria` |
| Notificacoes | `src/app/api/notificacoes/*` | `/notificacoes` | `notificacoes` |
| Dashboards | `src/app/api/admin/dashboard/route.ts`, `src/app/api/gestor/dashboard/route.ts` | `/admin/dashboard`, `/gestor/dashboard` | agregacoes das tabelas acima |
| Landing publica | `src/app/api/public/landing/route.ts` | `/public/landing` | agregacoes de `escolas`, `alunos`, `questoes`, `simulados`, `usuarios` |

## Constantes de interface permitidas

Estes itens nao sao dados de negocio persistentes e podem continuar fixos no frontend:

- rotulos de abas, filtros, status e botoes;
- listas de passos de formularios;
- configuracoes visuais de graficos/componentes;
- textos institucionais da landing page;
- preferencias locais de sessao, tema e acessibilidade.

## Estado local restante

| Arquivo | Uso | Observacao |
| --- | --- | --- |
| `src/stores/auth-store.ts` | token/usuario logado no cliente | sessao local; dados reais continuam vindo de `/auth/me` e rotas backend |
| `src/stores/acessibilidade-store.ts` | preferencias visuais | nao e dado de negocio |
| `src/hooks/use-timer.ts` | timer visual em andamento | respostas do simulado persistem em `respostas` via backend |

## Verificacao de mocks

Busca runtime feita por:

```powershell
rg -n "mock|mocks|MSW|NEXT_PUBLIC_USE_MOCKS|seed_from_mocks|export-mocks|sedu-fila-respostas|sincronizarFila" src backend scripts README.md backend/README.md package.json docker-compose.yml
```

Resultado atual: sem dependencia runtime de MSW/mock/fila local de respostas. O estado local restante e sessao, acessibilidade e timer visual.

## Dados migrados

- Banco local Docker usado pela aplicacao: dados persistentes em `usuarios`, `alunos`, `escolas`, `turmas`, `questoes`, `alternativas`, `simulados`, `simulado_questoes`, `simulado_inscricoes`, `respostas`, `notificacoes` e `acoes_auditoria`.
- Usuario rapido de suporte: `roberto.nogueira@sedu.es.gov.br`.
- Usuarios `roberto.nogueira@sedu.es.gov.br` e `suporte@sedu.se.gov.br`: vinculados a `EEEFM Maria Ortiz`, por isso enxergam 29 alunos de suporte da escola.
- Admin acessando `/suporte/dashboard`: enxerga os 141 alunos com suporte/adaptacao da rede inteira.
- Questoes: registros persistidos com serie, materia, conteudo, nivel, escola, criador e alternativas no banco.
- Auditoria: login/logout, criacao/edicao/remocao de usuarios, escolas, questoes, importacao, criacao/montagem/liberacao/finalizacao de simulados, inscricao de aluno, respostas e suporte registram em `acoes_auditoria`.

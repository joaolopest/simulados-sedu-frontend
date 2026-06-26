# Documentação Técnica da Aplicação Simulados SEDU

Última revisão: 2026-06-26

## 1. Finalidade do documento

Este documento descreve a aplicação Simulados SEDU de forma funcional, técnica e
operacional. Ele foi escrito para ser entendido por professores, gestores,
avaliadores, banca de análise, equipe de suporte e equipe técnica.

O objetivo é permitir que uma pessoa que não participou do desenvolvimento
consiga responder:

- qual problema a aplicação resolve;
- quem usa a aplicação;
- quais fluxos principais existem;
- quais dados são manipulados;
- quais regras de acesso e segurança são aplicadas;
- como a aplicação está organizada tecnicamente;
- como executar, validar, operar e publicar a solução;
- quais documentos complementares devem ser consultados.

Este documento não substitui o Swagger/OpenAPI. O Swagger descreve endpoints da
API. Este documento descreve a aplicação como produto de software.

## 2. Metodologia de organização

A estrutura foi inspirada em práticas comuns de documentação de arquitetura e
documentação técnica:

- visão de contexto, containers e componentes, seguindo a ideia do modelo C4;
- seções de objetivos, contexto, blocos, runtime, deploy, riscos e decisões,
  alinhadas ao modelo arc42;
- separação entre explicação, referência e operação, seguindo a abordagem
  Diátaxis;
- linguagem clara, revisável e orientada ao leitor.

Na prática, o documento combina:

- descrição funcional para professores e avaliadores;
- referência técnica para desenvolvedores;
- runbooks para operação e validação;
- pontos de auditoria para análise externa.

## 3. Identificação da aplicação

| Item | Descrição |
| --- | --- |
| Nome | Simulados SEDU |
| Tipo | Aplicação web para gestão e aplicação de simulados escolares |
| Público principal | Secretaria, gestores, professores, suporte, alunos e candidatos |
| Frontend | Next.js 16, React 19 e TypeScript |
| Backend | FastAPI, SQLAlchemy 2 e PyJWT |
| Banco | PostgreSQL, via Supabase ou Postgres local Docker |
| Deploy atual | Vercel, com frontend e backend no mesmo projeto |
| URL de produção | `https://simulados-sedu.vercel.app` |
| URL pública planejada da documentação | `https://simulados-sedu.vercel.app/documentacao` |
| URL local da documentação | `http://localhost:3000/documentacao` |

## 4. Visão geral do produto

O Simulados SEDU é uma plataforma web para criação, aplicação, acompanhamento e
análise de simulados escolares.

A aplicação permite que equipes administrativas e pedagógicas:

- cadastrem e organizem questões;
- montem provas e simulados;
- inscrevam alunos;
- liberem simulados;
- acompanhem execução e resultados;
- consultem dashboards;
- registrem suporte e acompanhamento;
- auditem ações relevantes.

Alunos e candidatos usam a aplicação para acessar simulados disponíveis,
responder questões, finalizar tentativas e consultar resultados quando
permitido.

## 5. Escopo

### 5.1 Dentro do escopo atual

| Área | Funcionalidades incluídas |
| --- | --- |
| Autenticação | login, dados do usuário autenticado, recuperação e primeiro acesso |
| Perfis | admin, gestor, professor, suporte, aluno e candidato |
| Estrutura escolar | escolas, turmas, alunos e vínculos |
| Questões | cadastro, edição, filtros, revisão, publicação, arquivamento, exclusão e versionamento |
| Provas/simulados | criação manual, automática ou híbrida, montagem, validação, liberação e duplicação |
| Inscrições | associação de alunos a simulados individualmente, em lote ou por turma |
| Execução pelo aluno | início, resposta, autosave e finalização |
| Resultados | nota, acertos, erros, brancos, tempo e histórico |
| Dashboards | visões para admin, gestor, professor, suporte e aluno |
| Notificações | notificações persistidas no banco |
| Auditoria | registro de ações relevantes |
| IA controlada | heurísticas locais para rascunhos de questões e plano de reforço |
| API | backend FastAPI documentado em Swagger/OpenAPI |

### 5.2 Fora do escopo atual

| Item | Situação atual |
| --- | --- |
| Integração com provedores externos de IA | Não existe em runtime no estado atual |
| App mobile nativo | Não faz parte da aplicação atual |
| Integração direta com sistemas oficiais externos | Não identificada como runtime atual |
| Pagamento, assinatura ou cobrança | Não aplicável |
| Acesso direto do frontend ao banco | Não permitido |

## 6. Perfis e responsabilidades

| Perfil | Responsabilidade funcional | Restrições principais |
| --- | --- | --- |
| Admin | Gestão global da plataforma, usuários, escolas, configurações, questões, auditoria e revisões | Acesso amplo, ainda sujeito às validações da API |
| Gestor | Administração da escola, turmas, simulados, inscrições, alertas e questões no escopo escolar | Deve respeitar o escopo da escola |
| Professor | Criação de questões, montagem de provas e acompanhamento pedagógico permitido | Pode ter restrição para editar questões de outros autores |
| Suporte | Acompanhamento de alunos que exigem suporte, adaptação, nota ou apoio presencial | Acesso focado em acompanhamento |
| Aluno | Realização de simulados, respostas, resultados, histórico e notificações próprias | Só acessa dados próprios |
| Candidato | Fluxo equivalente ao de aluno quando aplicável | Só acessa dados próprios |

O frontend direciona a navegação conforme o perfil. A autorização real é aplicada
no backend.

## 7. Requisitos funcionais

### 7.1 Autenticação e sessão

| Código | Requisito |
| --- | --- |
| RF-AUT-01 | Permitir login com credenciais válidas |
| RF-AUT-02 | Bloquear login de usuário inativo |
| RF-AUT-03 | Manter sessão por token |
| RF-AUT-04 | Permitir consulta dos dados do usuário autenticado |
| RF-AUT-05 | Redirecionar usuário para a área correta de acordo com perfil |

### 7.2 Questões

| Código | Requisito |
| --- | --- |
| RF-QUE-01 | Cadastrar questões com enunciado, alternativas, resposta correta e metadados pedagógicos |
| RF-QUE-02 | Filtrar questões por série, matéria, conteúdo, nível, status e outros critérios |
| RF-QUE-03 | Editar questões conforme perfil e escopo |
| RF-QUE-04 | Registrar versões de questões alteradas |
| RF-QUE-05 | Permitir publicação, arquivamento, exclusão e revisão conforme permissão |
| RF-QUE-06 | Exportar banco de questões filtrado quando permitido |

### 7.3 Provas e simulados

| Código | Requisito |
| --- | --- |
| RF-SIM-01 | Criar simulado manualmente |
| RF-SIM-02 | Criar simulado automaticamente por critérios |
| RF-SIM-03 | Montar simulado com questões selecionadas |
| RF-SIM-04 | Validar simulado antes da liberação |
| RF-SIM-05 | Liberar simulado para alunos inscritos |
| RF-SIM-06 | Duplicar simulado quando permitido |
| RF-SIM-07 | Reabrir tentativa de aluno mediante autorização |

### 7.4 Fluxo do aluno

| Código | Requisito |
| --- | --- |
| RF-ALU-01 | Listar simulados disponíveis para o aluno |
| RF-ALU-02 | Permitir início de simulado inscrito e liberado |
| RF-ALU-03 | Salvar respostas durante a execução |
| RF-ALU-04 | Finalizar tentativa |
| RF-ALU-05 | Impedir nova tentativa sem reabertura autorizada |
| RF-ALU-06 | Exibir resultado e histórico conforme regras do simulado |

### 7.5 Gestão, suporte e auditoria

| Código | Requisito |
| --- | --- |
| RF-GES-01 | Gerenciar turmas, alunos e inscrições |
| RF-GES-02 | Exibir dashboards por perfil |
| RF-SUP-01 | Permitir acompanhamento de alunos com suporte/adaptação |
| RF-AUD-01 | Registrar ações relevantes em auditoria |
| RF-NOT-01 | Persistir e consultar notificações |

## 8. Regras de negócio principais

### 8.1 Autenticação

- Usuários precisam estar autenticados para acessar áreas internas.
- Rotas públicas incluem landing, login, recuperação, primeiro acesso e
  documentação pública.
- O token é enviado como bearer token para chamadas internas.
- O perfil também é mantido em cookie para redirecionamento visual no frontend.

### 8.2 Controle por perfil

- O backend valida permissão em cada rota protegida.
- O frontend não é fonte de verdade de autorização.
- Admin possui escopo global.
- Gestor, professor e suporte podem ter escopo limitado por escola ou autoria.
- Aluno e candidato só devem acessar os próprios dados.

### 8.3 Questões

- Questões possuem metadados pedagógicos como série, matéria, conteúdo e nível.
- Alternativas pertencem a uma questão.
- Mudanças relevantes podem gerar versão auditável.
- Professores podem ter restrição para alterar questões de outros autores.
- Revisões permitem controle sobre qualidade e governança do banco de questões.

### 8.4 Simulados

- Simulados precisam ter estrutura válida antes da liberação.
- Alunos só realizam simulados em que estão inscritos e que foram liberados.
- Finalização gera resultado persistido.
- Nova tentativa depende de reabertura autorizada.
- Ações como criação, montagem, liberação, inscrição, resposta e finalização
  devem ser rastreáveis.

### 8.5 IA controlada

- A aplicação não usa APIs externas de IA em runtime no estado atual.
- A chamada "IA" atual é heurística local no backend.
- Rascunhos de questões exigem revisão humana.
- Plano de reforço é apoio pedagógico, não decisão automática final.

## 9. Jornadas de uso

### 9.1 Professor ou gestor criando um simulado

1. Acessa a plataforma com perfil autorizado.
2. Consulta ou cadastra questões.
3. Cria um simulado.
4. Seleciona questões manualmente ou usa apoio automático.
5. Valida a estrutura do simulado.
6. Inscreve alunos ou turmas.
7. Libera o simulado.
8. Acompanha execução e resultados.

### 9.2 Aluno realizando um simulado

1. Acessa a área de aluno.
2. Visualiza simulados disponíveis.
3. Lê orientações.
4. Inicia a tentativa.
5. Responde às questões.
6. O sistema salva as respostas.
7. Finaliza o simulado.
8. Consulta resultado quando disponível.

### 9.3 Suporte acompanhando aluno

1. Acessa painel de suporte.
2. Localiza aluno dentro do escopo permitido.
3. Consulta dados relevantes de acompanhamento.
4. Registra nota, apoio presencial ou acompanhamento.
5. A ação fica disponível para consulta e auditoria.

### 9.4 Admin auditando a aplicação

1. Acessa área administrativa.
2. Consulta usuários, escolas, questões, dashboards e configurações.
3. Acessa auditoria.
4. Verifica eventos relevantes e integridade operacional.
5. Executa diagnóstico quando necessário.

## 10. Arquitetura lógica

### 10.1 Visão de contexto

```text
Usuário
  |
  | navegador web
  v
Aplicação Next.js
  |
  | rotas internas /api
  v
Backend FastAPI
  |
  | SQLAlchemy
  v
PostgreSQL
```

### 10.2 Containers principais

| Container | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Browser | Navegador web | Renderiza interface e executa interações do usuário |
| Frontend | Next.js App Router | Páginas, layouts, navegação e experiência de uso |
| BFF | Next.js Route Handlers em `/api` | Adapta chamadas da interface para o backend |
| Backend | FastAPI | Regras de negócio, autenticação, autorização, auditoria e contratos HTTP |
| Banco | PostgreSQL | Persistência relacional dos dados de negócio |

### 10.3 Componentes internos relevantes

| Componente | Caminho | Responsabilidade |
| --- | --- | --- |
| Páginas do frontend | `src/app` | Telas por perfil e rotas públicas |
| Rotas BFF | `src/app/api` | Camada intermediária entre browser e FastAPI |
| Cliente HTTP do browser | `src/lib/api.ts` | Axios com base `/api` |
| Cliente backend server-side | `src/lib/backend.ts` | Resolve URL do FastAPI e normaliza erros |
| Mapeamento de payloads | `src/lib/backend-maps.ts` | Adapta respostas do backend para o frontend |
| Controle visual de sessão | `src/proxy.ts` | Redireciona rotas conforme autenticação/perfil |
| API FastAPI | `backend/app/api/main.py` | Montagem do app, middlewares, routers e healthchecks |
| Permissões | `backend/app/api/permissoes.py` | Dependências RBAC e escopos |
| Modelos de dados | `backend/app/models.py` | Tabelas e relacionamentos SQLAlchemy |
| Serviços de domínio | `backend/app/services` | Regras de negócio |

## 11. Fluxo técnico de requisição

1. O usuário interage com uma tela.
2. A tela ou hook chama o cliente Axios em `src/lib/api.ts`.
3. O Axios chama uma rota em `/api`.
4. A rota BFF no Next.js executa no servidor.
5. O BFF usa `backendFetch` ou `backendFetchRaw`.
6. `src/lib/backend.ts` resolve a base do backend:
   - `BACKEND_URL`, quando definida;
   - `https://${VERCEL_URL}/_/backend`, em deploy Vercel;
   - `http://127.0.0.1:8000`, em desenvolvimento local.
7. O FastAPI processa autenticação, permissão e regra de negócio.
8. O backend persiste ou lê dados no PostgreSQL.
9. O BFF adapta a resposta quando necessário.
10. A interface atualiza o estado visual.

## 12. API e contratos

### 12.1 Endpoints de documentação

| Ambiente | URL |
| --- | --- |
| Swagger produção | `https://simulados-sedu.vercel.app/_/backend/docs` |
| OpenAPI produção | `https://simulados-sedu.vercel.app/_/backend/openapi.json` |
| Swagger local | `http://localhost:8000/docs` |
| OpenAPI local | `http://localhost:8000/openapi.json` |

### 12.2 Principais grupos da API

| Grupo | Prefixo FastAPI | Uso |
| --- | --- | --- |
| Autenticação | `/auth` | login, sessão, recuperação e primeiro acesso |
| Cadastro | `/cadastro` | cadastro de aluno |
| Estrutura | `/estrutura` | escolas, turmas e alunos |
| Usuários | `/usuarios` | gestão de usuários |
| Questões | `/questoes` | banco de questões, métricas, exportação e revisões |
| Provas | `/provas` | geração e prova avulsa |
| Simulados | `/simulados` | criação, questões, inscrições, liberação e resultados |
| Painéis | `/admin`, `/gestor`, `/professor`, `/aluno`, `/suporte` | dashboards e fluxos agregados |
| Respostas | `/respostas` | salvamento de respostas |
| Notificações | `/notificacoes` | mensagens persistidas |
| Auditoria | `/auditoria` | consulta e registro de eventos |
| Diagnóstico | `/health`, `/health/detalhado`, `/diagnostico` | saúde operacional |
| IA controlada | `/ia` | rascunhos e plano de reforço |

### 12.3 Formato de erro

Erros são normalizados para um formato amigável ao frontend:

```json
{
  "codigo": "VALIDACAO",
  "mensagem": "Dados inválidos. Confira os campos enviados.",
  "detalhes": []
}
```

O backend também usa códigos como `NAO_AUTENTICADO`, `SEM_PERMISSAO`,
`NAO_ENCONTRADO`, `CONFLITO` e `MUITAS_TENTATIVAS`.

## 13. Modelo de dados

### 13.1 Principais entidades

| Área | Tabelas ou entidades principais |
| --- | --- |
| Configurações | `configuracoes_sistema` |
| Estrutura escolar | `escolas`, `turmas`, `series` |
| Usuários e alunos | `usuarios`, `alunos` |
| Questões | `questoes`, `alternativas`, `questao_versoes`, `revisoes_questao` |
| Simulados | `simulados`, `simulado_questoes`, `simulado_inscricoes` |
| Respostas | `respostas` |
| Notificações | `notificacoes` |
| Auditoria | `acoes_auditoria` |

### 13.2 Princípios de persistência

- Dados de negócio persistem em PostgreSQL.
- O frontend não acessa o banco diretamente.
- O backend é responsável por integridade, escopo e autorização.
- Estados locais do frontend devem se limitar a sessão, preferências visuais e
  estado transitório da interface.
- A auditoria registra ações relevantes para rastreabilidade.

## 14. Segurança, privacidade e auditoria

### 14.1 Mecanismos aplicados

| Mecanismo | Como é aplicado |
| --- | --- |
| Autenticação | Token JWT emitido pelo backend |
| Sessão no frontend | Cookies `sedu-token` e `sedu-perfil`, além de store local |
| Proteção visual de rotas | `src/proxy.ts` |
| Autorização real | Dependências FastAPI em `backend/app/api/permissoes.py` |
| Escopo de dados | Perfil, escola, autoria e dono do aluno |
| Auditoria | Eventos persistidos em `acoes_auditoria` |
| CORS | Configurado no backend por origens permitidas |

### 14.2 Diretrizes de segurança

- Não expor credenciais em documentação pública.
- Não publicar `DATABASE_URL`, segredo JWT ou senhas reais.
- Não considerar ocultação de botões como autorização suficiente.
- Não permitir que aluno acesse dados de outro aluno.
- Não permitir que professor edite conteúdo fora do escopo definido.
- Registrar ações sensíveis em auditoria.

## 15. Requisitos não funcionais

| Categoria | Requisito |
| --- | --- |
| Disponibilidade | API deve responder healthcheck simples e detalhado |
| Rastreabilidade | Ações relevantes devem ser auditadas |
| Segurança | Backend deve validar autenticação e perfil |
| Manutenibilidade | Rotas BFF devem centralizar adaptação entre frontend e backend |
| Portabilidade local | Ambiente deve rodar com Supabase ou Postgres local Docker |
| Observabilidade | Respostas do backend incluem `x-request-id` e `x-response-time-ms` |
| Qualidade | Projeto deve passar em TypeScript, ESLint e QA final |
| Acessibilidade | Interface deve manter navegação e leitura adequadas para público amplo |

## 16. Ambientes e configuração

### 16.1 Ambientes

| Ambiente | Finalidade | URL |
| --- | --- | --- |
| Local frontend | Desenvolvimento e revisão visual | `http://localhost:3000` |
| Local backend | API local FastAPI | `http://127.0.0.1:8000` |
| Produção frontend | Aplicação pública | `https://simulados-sedu.vercel.app` |
| Produção backend | API FastAPI direta | `https://simulados-sedu.vercel.app/_/backend` |

### 16.2 Variáveis principais

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL/Supabase |
| `SEDU_JWT_SECRET` | Assinatura dos tokens JWT |
| `BACKEND_URL` | URL explícita do backend para o BFF |
| `VERCEL_URL` | Host do deployment Vercel |
| `CORS_ORIGINS` | Origens permitidas no backend |
| `NEXT_PUBLIC_APP_URL` | URL pública usada em validações quando necessário |

Arquivos de exemplo:

- `.env.example`
- `backend/.env.example`

## 17. Execução local

### 17.1 Execução recomendada no Windows

```powershell
.\scripts\start-app.ps1
```

Esse script:

- lê `.env` e `backend/.env`;
- testa `DATABASE_URL`;
- usa Supabase se disponível;
- sobe Postgres local Docker se Supabase não responder;
- inicia backend e frontend via Docker Compose.

### 17.2 Execução com Docker

Com Supabase:

```powershell
docker compose up --build backend frontend
```

Com Postgres local:

```powershell
docker compose --profile local-db up --build
```

### 17.3 Execução manual do backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.api.main:app --reload --host 127.0.0.1 --port 8000
```

### 17.4 Execução manual do frontend

```powershell
pnpm install
$env:BACKEND_URL="http://127.0.0.1:8000"
pnpm run dev
```

## 18. Qualidade e validação

### 18.1 Comandos principais

```powershell
pnpm run lint
pnpm run build
pnpm run qa:final
```

### 18.2 QA rápido

```powershell
pnpm run qa:final -- --skip-backend --skip-build
```

### 18.3 QA contra produção

```powershell
pnpm run qa:final -- --backend-url=https://simulados-sedu.vercel.app/_/backend --skip-build
```

### 18.4 O que o QA confere

- ausência de mocks/MSW/fila local no runtime;
- healthcheck detalhado;
- OpenAPI com rotas essenciais;
- fluxo Postman local quando collection existe;
- TypeScript;
- ESLint;
- build Next.js, quando não ignorado.

## 19. Deploy e publicação

O projeto usa Vercel com `experimentalServices`.

O arquivo `vercel.json` publica:

- frontend em `/`;
- backend FastAPI em `/_/backend`;
- região `gru1`.

Resultado esperado:

| Recurso | URL |
| --- | --- |
| Aplicação | `https://simulados-sedu.vercel.app` |
| Documentação pública | `https://simulados-sedu.vercel.app/documentacao` |
| Backend direto | `https://simulados-sedu.vercel.app/_/backend` |
| Swagger | `https://simulados-sedu.vercel.app/_/backend/docs` |
| OpenAPI | `https://simulados-sedu.vercel.app/_/backend/openapi.json` |

Antes de publicar a documentação, revisar:

- se o texto está adequado para leitura externa;
- se não há credenciais ou dados sensíveis;
- se links públicos respondem corretamente;
- se a documentação deve ficar pública ou protegida por login;
- se o conteúdo reflete o código atual.

## 20. Operação e runbooks

### 20.1 Verificar saúde do backend local

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health/detalhado -UseBasicParsing
```

### 20.2 Verificar saúde do backend em produção

```powershell
Invoke-WebRequest https://simulados-sedu.vercel.app/_/backend/health/detalhado -UseBasicParsing
```

### 20.3 Validar OpenAPI local

```powershell
Invoke-WebRequest http://127.0.0.1:8000/openapi.json -UseBasicParsing
```

### 20.4 Sincronizar Supabase para Postgres local

```powershell
.\scripts\sync-supabase-to-local.ps1 -Yes
```

Esse script copia dados do Supabase para o Postgres local. Ele pode sobrescrever
o backup local, mas não apaga o Supabase.

### 20.5 Importar questões ENEM

```powershell
backend\.venv\Scripts\python.exe backend\scripts\importar_enem_zip.py --zip C:\Projects\Dev\enem-api-main.zip
```

Para reprocessar sem duplicar:

```powershell
backend\.venv\Scripts\python.exe backend\scripts\importar_enem_zip.py --zip C:\Projects\Dev\enem-api-main.zip --atualizar-existentes
```

## 21. Troubleshooting

| Sintoma | Causa provável | Ação recomendada |
| --- | --- | --- |
| `/documentacao` redireciona para login | Rota não liberada no proxy | Verificar `ROTAS_ABERTAS` em `src/proxy.ts` |
| Frontend mostra erro de rede | Backend parado ou `BACKEND_URL` incorreta | Validar backend e variável de ambiente |
| Swagger local não abre | FastAPI não está rodando | Subir backend em `127.0.0.1:8000` |
| `/health/detalhado` indica banco offline | Banco indisponível ou `DATABASE_URL` inválida | Conferir `.env`, Supabase ou Docker |
| Usuário cai no login após autenticar | Cookies de sessão ausentes ou expirados | Refazer login e verificar `sedu-token`/`sedu-perfil` |
| Perfil acessa área errada | Cookie de perfil ou regra de proxy inconsistente | Conferir `src/proxy.ts` e permissões do backend |
| Produção retorna 404 em `/_/backend` | Serviço FastAPI não exposto no deploy | Conferir `vercel.json` e deployment |

## 22. Riscos, limites e decisões conhecidas

| Tema | Situação | Observação |
| --- | --- | --- |
| IA externa | Não usada em runtime | Evita envio de dados a terceiros no estado atual |
| BFF | Frontend chama `/api`, não FastAPI direto | Facilita adaptação de payloads |
| Banco | PostgreSQL obrigatório | SQLite não é fallback runtime |
| Autorização | Backend é fonte de verdade | Frontend apenas orienta navegação |
| Documentação pública | Deve evitar dados sensíveis | Revisar antes do deploy |
| Deploy Vercel | Usa `experimentalServices` | Verificar compatibilidade em mudanças futuras |

## 23. Critérios de aceite da documentação pública

Para considerar esta documentação pronta para publicação:

- descreve objetivo, escopo e público;
- explica perfis e permissões;
- documenta fluxos principais;
- apresenta arquitetura e dados;
- informa links de API e ambientes;
- descreve segurança, auditoria e operação;
- inclui comandos de execução e QA;
- lista limitações conhecidas;
- não contém segredos;
- foi revisada por alguém responsável pelo projeto.

## 24. Glossário

| Termo | Significado |
| --- | --- |
| BFF | Backend for Frontend, camada Next.js `/api` entre interface e FastAPI |
| FastAPI | Framework Python usado no backend |
| OpenAPI | Especificação JSON dos endpoints da API |
| Swagger | Interface interativa para explorar a API |
| Simulado | Prova aplicada a alunos/candidatos |
| Questão | Item com enunciado, alternativas e resposta correta |
| Auditoria | Registro de ações relevantes |
| RBAC | Controle de acesso baseado em papéis/perfis |
| Supabase | Serviço usado como PostgreSQL principal em produção |
| Heurística local | Regra calculada no backend sem provedor externo de IA |

## 25. Documentação relacionada

| Documento | Finalidade |
| --- | --- |
| `README.md` | Visão geral técnica do projeto |
| `backend/README.md` | Informações específicas do backend |
| `docs/postman-fluxo-backend.md` | Fluxo principal da API no Postman |
| `docs/qa-final.md` | Verificação final local e contra produção |
| `docs/mapeamento-dados-backend.md` | Mapeamento de dados entre frontend, backend e banco |
| `docs/analise-boas-praticas.md` | Pontos de qualidade, riscos e melhorias |

## 26. Governança da documentação

Esta documentação deve ser revisada quando houver:

- novo perfil de usuário;
- nova regra de permissão;
- mudança no fluxo de simulados;
- mudança no modelo de dados;
- nova integração externa;
- alteração no deploy;
- mudança no contrato da API;
- inclusão de provedor externo de IA;
- publicação de nova URL pública.

Manter a documentação sincronizada com o sistema evita que professores,
avaliadores e equipe técnica usem uma referência desatualizada.

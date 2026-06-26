import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileCode2,
  FileText,
  KeyRound,
  Layers3,
  ListChecks,
  MonitorCog,
  Network,
  Route,
  Server,
  ShieldCheck,
  Terminal,
  Users,
} from "lucide-react";
import { ToggleTema } from "@/components/layout/toggle-tema";

export const metadata: Metadata = {
  title: "Documentação Técnica | Simulados SEDU",
  description:
    "Documentação técnica e funcional da aplicação Simulados SEDU para professores, gestores, avaliadores e equipe técnica.",
};

const indice = [
  ["Finalidade", "#finalidade"],
  ["Identificação", "#identificacao"],
  ["Escopo", "#escopo"],
  ["Perfis", "#perfis"],
  ["Requisitos", "#requisitos"],
  ["Regras", "#regras"],
  ["Jornadas", "#jornadas"],
  ["Arquitetura", "#arquitetura"],
  ["API", "#api"],
  ["Dados", "#dados"],
  ["Segurança", "#seguranca"],
  ["Ambientes", "#ambientes"],
  ["Operação", "#operacao"],
  ["Riscos", "#riscos"],
  ["Glossário", "#glossario"],
];

const identificacao = [
  ["Nome", "Simulados SEDU"],
  ["Tipo", "Aplicação web para gestão e aplicação de simulados escolares"],
  ["Público principal", "Secretaria, gestores, professores, suporte, alunos e candidatos"],
  ["Frontend", "Next.js 16, React 19 e TypeScript"],
  ["Backend", "FastAPI, SQLAlchemy 2 e PyJWT"],
  ["Banco", "PostgreSQL via Supabase ou Postgres local Docker"],
  ["Deploy atual", "Vercel com frontend e backend no mesmo projeto"],
  ["URL de produção", "https://simulados-sedu.vercel.app"],
];

const perfis = [
  ["Admin", "Gestão global da plataforma, usuários, escolas, configurações, questões, auditoria e revisões.", "Acesso amplo, ainda sujeito às validações da API."],
  ["Gestor", "Administração da escola, turmas, simulados, inscrições, alertas e questões no escopo escolar.", "Deve respeitar o escopo da escola."],
  ["Professor", "Criação de questões, montagem de provas e acompanhamento pedagógico permitido.", "Pode ter restrição para editar questões de outros autores."],
  ["Suporte", "Acompanhamento de alunos que exigem suporte, adaptação, nota ou apoio presencial.", "Acesso focado em acompanhamento."],
  ["Aluno", "Realização de simulados, respostas, resultados, histórico e notificações próprias.", "Só acessa dados próprios."],
  ["Candidato", "Fluxo equivalente ao de aluno quando aplicável.", "Só acessa dados próprios."],
];

const escopoAtual = [
  ["Autenticação", "login, dados do usuário autenticado, recuperação e primeiro acesso"],
  ["Perfis", "admin, gestor, professor, suporte, aluno e candidato"],
  ["Estrutura escolar", "escolas, turmas, alunos e vínculos"],
  ["Questões", "cadastro, edição, filtros, revisão, publicação, arquivamento, exclusão e versionamento"],
  ["Provas/simulados", "criação manual, automática ou híbrida, montagem, validação, liberação e duplicação"],
  ["Inscrições", "associação de alunos a simulados individualmente, em lote ou por turma"],
  ["Execução pelo aluno", "início, resposta, autosave e finalização"],
  ["Resultados", "nota, acertos, erros, brancos, tempo e histórico"],
  ["Dashboards", "visões para admin, gestor, professor, suporte e aluno"],
  ["Notificações e auditoria", "mensagens persistidas e registro de ações relevantes"],
  ["IA controlada", "heurísticas locais para rascunhos de questões e plano de reforço"],
  ["API", "backend FastAPI documentado em Swagger/OpenAPI"],
];

const foraEscopo = [
  ["Integração com provedores externos de IA", "Não existe em runtime no estado atual"],
  ["App mobile nativo", "Não faz parte da aplicação atual"],
  ["Integração direta com sistemas oficiais externos", "Não identificada como runtime atual"],
  ["Pagamento, assinatura ou cobrança", "Não aplicável"],
  ["Acesso direto do frontend ao banco", "Não permitido"],
];

const requisitos = [
  {
    grupo: "Autenticação e sessão",
    itens: [
      ["RF-AUT-01", "Permitir login com credenciais válidas"],
      ["RF-AUT-02", "Bloquear login de usuário inativo"],
      ["RF-AUT-03", "Manter sessão por token"],
      ["RF-AUT-04", "Permitir consulta dos dados do usuário autenticado"],
      ["RF-AUT-05", "Redirecionar usuário para a área correta de acordo com perfil"],
    ],
  },
  {
    grupo: "Questões",
    itens: [
      ["RF-QUE-01", "Cadastrar questões com enunciado, alternativas, resposta correta e metadados pedagógicos"],
      ["RF-QUE-02", "Filtrar questões por série, matéria, conteúdo, nível, status e outros critérios"],
      ["RF-QUE-03", "Editar questões conforme perfil e escopo"],
      ["RF-QUE-04", "Registrar versões de questões alteradas"],
      ["RF-QUE-05", "Permitir publicação, arquivamento, exclusão e revisão conforme permissão"],
      ["RF-QUE-06", "Exportar banco de questões filtrado quando permitido"],
    ],
  },
  {
    grupo: "Provas e simulados",
    itens: [
      ["RF-SIM-01", "Criar simulado manualmente"],
      ["RF-SIM-02", "Criar simulado automaticamente por critérios"],
      ["RF-SIM-03", "Montar simulado com questões selecionadas"],
      ["RF-SIM-04", "Validar simulado antes da liberação"],
      ["RF-SIM-05", "Liberar simulado para alunos inscritos"],
      ["RF-SIM-06", "Duplicar simulado quando permitido"],
      ["RF-SIM-07", "Reabrir tentativa de aluno mediante autorização"],
    ],
  },
  {
    grupo: "Aluno, gestão e auditoria",
    itens: [
      ["RF-ALU-01", "Listar simulados disponíveis para o aluno"],
      ["RF-ALU-02", "Permitir início de simulado inscrito e liberado"],
      ["RF-ALU-03", "Salvar respostas durante a execução"],
      ["RF-ALU-04", "Finalizar tentativa e persistir resultado"],
      ["RF-GES-01", "Gerenciar turmas, alunos e inscrições"],
      ["RF-AUD-01", "Registrar ações relevantes em auditoria"],
    ],
  },
];

const regras = [
  {
    titulo: "Autenticação",
    itens: [
      "Usuários precisam estar autenticados para acessar áreas internas.",
      "Rotas públicas incluem landing, login, recuperação, primeiro acesso e documentação.",
      "O token é enviado como bearer token para chamadas internas.",
      "O perfil em cookie orienta redirecionamentos visuais no frontend.",
    ],
  },
  {
    titulo: "Controle por perfil",
    itens: [
      "O backend valida permissão em cada rota protegida.",
      "O frontend não é fonte de verdade de autorização.",
      "Admin possui escopo global.",
      "Gestor, professor e suporte podem ter escopo limitado por escola ou autoria.",
      "Aluno e candidato só devem acessar os próprios dados.",
    ],
  },
  {
    titulo: "Questões",
    itens: [
      "Questões possuem metadados pedagógicos como série, matéria, conteúdo e nível.",
      "Alternativas pertencem a uma questão.",
      "Mudanças relevantes podem gerar versão auditável.",
      "Revisões controlam qualidade e governança do banco de questões.",
    ],
  },
  {
    titulo: "Simulados",
    itens: [
      "Simulados precisam ter estrutura válida antes da liberação.",
      "Alunos só realizam simulados em que estão inscritos e que foram liberados.",
      "Finalização gera resultado persistido.",
      "Nova tentativa depende de reabertura autorizada.",
    ],
  },
  {
    titulo: "IA controlada",
    itens: [
      "A aplicação não usa APIs externas de IA em runtime no estado atual.",
      "A chamada IA atual é heurística local no backend.",
      "Rascunhos de questões exigem revisão humana.",
      "Plano de reforço é apoio pedagógico, não decisão automática final.",
    ],
  },
];

const jornadas = [
  {
    titulo: "Professor ou gestor criando um simulado",
    passos: [
      "Acessa a plataforma com perfil autorizado.",
      "Consulta ou cadastra questões.",
      "Cria um simulado.",
      "Seleciona questões manualmente ou usa apoio automático.",
      "Valida a estrutura do simulado.",
      "Inscreve alunos ou turmas.",
      "Libera o simulado.",
      "Acompanha execução e resultados.",
    ],
  },
  {
    titulo: "Aluno realizando um simulado",
    passos: [
      "Acessa a área de aluno.",
      "Visualiza simulados disponíveis.",
      "Lê orientações.",
      "Inicia a tentativa.",
      "Responde às questões.",
      "O sistema salva as respostas.",
      "Finaliza o simulado.",
      "Consulta resultado quando disponível.",
    ],
  },
  {
    titulo: "Suporte acompanhando aluno",
    passos: [
      "Acessa painel de suporte.",
      "Localiza aluno dentro do escopo permitido.",
      "Consulta dados relevantes de acompanhamento.",
      "Registra nota, apoio presencial ou acompanhamento.",
      "A ação fica disponível para consulta e auditoria.",
    ],
  },
  {
    titulo: "Admin auditando a aplicação",
    passos: [
      "Acessa área administrativa.",
      "Consulta usuários, escolas, questões, dashboards e configurações.",
      "Acessa auditoria.",
      "Verifica eventos relevantes e integridade operacional.",
      "Executa diagnóstico quando necessário.",
    ],
  },
];

const containers = [
  ["Browser", "Navegador web", "Renderiza interface e executa interações do usuário"],
  ["Frontend", "Next.js App Router", "Páginas, layouts, navegação e experiência de uso"],
  ["BFF", "Next.js Route Handlers em /api", "Adapta chamadas da interface para o backend"],
  ["Backend", "FastAPI", "Regras de negócio, autenticação, autorização, auditoria e contratos HTTP"],
  ["Banco", "PostgreSQL", "Persistência relacional dos dados de negócio"],
];

const componentes = [
  ["Páginas do frontend", "src/app", "Telas por perfil e rotas públicas"],
  ["Rotas BFF", "src/app/api", "Camada intermediária entre browser e FastAPI"],
  ["Cliente HTTP do browser", "src/lib/api.ts", "Axios com base /api"],
  ["Cliente backend server-side", "src/lib/backend.ts", "Resolve URL do FastAPI e normaliza erros"],
  ["Mapeamento de payloads", "src/lib/backend-maps.ts", "Adapta respostas do backend para o frontend"],
  ["Controle visual de sessão", "src/proxy.ts", "Redireciona rotas conforme autenticação/perfil"],
  ["API FastAPI", "backend/app/api/main.py", "App, middlewares, routers e healthchecks"],
  ["Permissões", "backend/app/api/permissoes.py", "Dependências RBAC e escopos"],
  ["Modelos de dados", "backend/app/models.py", "Tabelas e relacionamentos SQLAlchemy"],
  ["Serviços de domínio", "backend/app/services", "Regras de negócio"],
];

const fluxoRequisicao = [
  "Usuário interage com uma tela.",
  "A tela ou hook chama o cliente Axios em src/lib/api.ts.",
  "O Axios chama uma rota em /api.",
  "A rota BFF no Next.js executa no servidor.",
  "O BFF usa backendFetch ou backendFetchRaw.",
  "src/lib/backend.ts resolve a base do backend.",
  "O FastAPI processa autenticação, permissão e regra de negócio.",
  "O backend persiste ou lê dados no PostgreSQL.",
  "O BFF adapta a resposta quando necessário.",
  "A interface atualiza o estado visual.",
];

const apiGroups = [
  ["/auth", "login, sessão, recuperação e primeiro acesso"],
  ["/cadastro", "cadastro de aluno"],
  ["/estrutura", "escolas, turmas e alunos"],
  ["/usuarios", "gestão de usuários"],
  ["/questoes", "banco de questões, métricas, exportação e revisões"],
  ["/provas", "geração e prova avulsa"],
  ["/simulados", "criação, questões, inscrições, liberação e resultados"],
  ["/admin, /gestor, /professor, /aluno, /suporte", "dashboards e fluxos agregados"],
  ["/respostas", "salvamento de respostas"],
  ["/notificacoes", "mensagens persistidas"],
  ["/auditoria", "consulta e registro de eventos"],
  ["/health, /health/detalhado, /diagnostico", "saúde operacional"],
  ["/ia", "rascunhos e plano de reforço"],
];

const apiLinks = [
  ["Swagger produção", "https://simulados-sedu.vercel.app/_/backend/docs"],
  ["OpenAPI produção", "https://simulados-sedu.vercel.app/_/backend/openapi.json"],
  ["Swagger local", "http://localhost:8000/docs"],
  ["OpenAPI local", "http://localhost:8000/openapi.json"],
];

const entidades = [
  ["Configurações", "configuracoes_sistema"],
  ["Estrutura escolar", "escolas, turmas, series"],
  ["Usuários e alunos", "usuarios, alunos"],
  ["Questões", "questoes, alternativas, questao_versoes, revisoes_questao"],
  ["Simulados", "simulados, simulado_questoes, simulado_inscricoes"],
  ["Respostas", "respostas"],
  ["Notificações", "notificacoes"],
  ["Auditoria", "acoes_auditoria"],
];

const seguranca = [
  ["Autenticação", "Token JWT emitido pelo backend"],
  ["Sessão no frontend", "Cookies sedu-token e sedu-perfil, além de store local"],
  ["Proteção visual de rotas", "src/proxy.ts"],
  ["Autorização real", "Dependências FastAPI em backend/app/api/permissoes.py"],
  ["Escopo de dados", "Perfil, escola, autoria e dono do aluno"],
  ["Auditoria", "Eventos persistidos em acoes_auditoria"],
  ["CORS", "Configurado no backend por origens permitidas"],
];

const diretrizesSeguranca = [
  "Não expor credenciais em documentação pública.",
  "Não publicar DATABASE_URL, segredo JWT ou senhas reais.",
  "Não considerar ocultação de botões como autorização suficiente.",
  "Não permitir que aluno acesse dados de outro aluno.",
  "Não permitir que professor edite conteúdo fora do escopo definido.",
  "Registrar ações sensíveis em auditoria.",
];

const requisitosNaoFuncionais = [
  ["Disponibilidade", "API deve responder healthcheck simples e detalhado"],
  ["Rastreabilidade", "Ações relevantes devem ser auditadas"],
  ["Segurança", "Backend deve validar autenticação e perfil"],
  ["Manutenibilidade", "Rotas BFF devem centralizar adaptação entre frontend e backend"],
  ["Portabilidade local", "Ambiente deve rodar com Supabase ou Postgres local Docker"],
  ["Observabilidade", "Respostas do backend incluem x-request-id e x-response-time-ms"],
  ["Qualidade", "Projeto deve passar em TypeScript, ESLint e QA final"],
  ["Acessibilidade", "Interface deve manter navegação e leitura adequadas para público amplo"],
];

const ambientes = [
  ["Local frontend", "Desenvolvimento e revisão visual", "http://localhost:3000"],
  ["Local backend", "API local FastAPI", "http://127.0.0.1:8000"],
  ["Produção frontend", "Aplicação pública", "https://simulados-sedu.vercel.app"],
  ["Produção backend", "API FastAPI direta", "https://simulados-sedu.vercel.app/_/backend"],
];

const variaveis = [
  ["DATABASE_URL", "Conexão PostgreSQL/Supabase"],
  ["SEDU_JWT_SECRET", "Assinatura dos tokens JWT"],
  ["BACKEND_URL", "URL explícita do backend para o BFF"],
  ["VERCEL_URL", "Host do deployment Vercel"],
  ["CORS_ORIGINS", "Origens permitidas no backend"],
  ["NEXT_PUBLIC_APP_URL", "URL pública usada em validações quando necessário"],
];

const comandos = [
  {
    titulo: "Execução recomendada no Windows",
    codigo: ".\\scripts\\start-app.ps1",
  },
  {
    titulo: "Frontend manual",
    codigo:
      'pnpm install\n$env:BACKEND_URL="http://127.0.0.1:8000"\npnpm run dev',
  },
  {
    titulo: "Backend manual",
    codigo:
      "cd backend\npy -3.12 -m venv .venv\n.\\.venv\\Scripts\\python -m pip install -r requirements.txt\n.\\.venv\\Scripts\\python -m uvicorn app.api.main:app --reload --host 127.0.0.1 --port 8000",
  },
  {
    titulo: "QA principal",
    codigo: "pnpm run lint\npnpm run build\npnpm run qa:final",
  },
  {
    titulo: "QA contra produção",
    codigo:
      "pnpm run qa:final -- --backend-url=https://simulados-sedu.vercel.app/_/backend --skip-build",
  },
];

const runbooks = [
  {
    titulo: "Verificar saúde do backend local",
    codigo: "Invoke-WebRequest http://127.0.0.1:8000/health/detalhado -UseBasicParsing",
  },
  {
    titulo: "Verificar saúde do backend em produção",
    codigo:
      "Invoke-WebRequest https://simulados-sedu.vercel.app/_/backend/health/detalhado -UseBasicParsing",
  },
  {
    titulo: "Validar OpenAPI local",
    codigo: "Invoke-WebRequest http://127.0.0.1:8000/openapi.json -UseBasicParsing",
  },
  {
    titulo: "Sincronizar Supabase para Postgres local",
    codigo: ".\\scripts\\sync-supabase-to-local.ps1 -Yes",
  },
  {
    titulo: "Importar questões ENEM",
    codigo:
      "backend\\.venv\\Scripts\\python.exe backend\\scripts\\importar_enem_zip.py --zip C:\\Projects\\Dev\\enem-api-main.zip",
  },
];

const troubleshooting = [
  ["/documentacao redireciona para login", "Rota não liberada no proxy", "Verificar ROTAS_ABERTAS em src/proxy.ts"],
  ["Frontend mostra erro de rede", "Backend parado ou BACKEND_URL incorreta", "Validar backend e variável de ambiente"],
  ["Swagger local não abre", "FastAPI não está rodando", "Subir backend em 127.0.0.1:8000"],
  ["/health/detalhado indica banco offline", "Banco indisponível ou DATABASE_URL inválida", "Conferir .env, Supabase ou Docker"],
  ["Usuário cai no login após autenticar", "Cookies de sessão ausentes ou expirados", "Refazer login e verificar sedu-token/sedu-perfil"],
  ["Perfil acessa área errada", "Cookie de perfil ou regra de proxy inconsistente", "Conferir src/proxy.ts e permissões do backend"],
  ["Produção retorna 404 em /_/backend", "Serviço FastAPI não exposto no deploy", "Conferir vercel.json e deployment"],
];

const riscos = [
  ["IA externa", "Não usada em runtime", "Evita envio de dados a terceiros no estado atual"],
  ["BFF", "Frontend chama /api, não FastAPI direto", "Facilita adaptação de payloads"],
  ["Banco", "PostgreSQL obrigatório", "SQLite não é fallback runtime"],
  ["Autorização", "Backend é fonte de verdade", "Frontend apenas orienta navegação"],
  ["Documentação pública", "Deve evitar dados sensíveis", "Revisar antes do deploy"],
  ["Deploy Vercel", "Usa experimentalServices", "Verificar compatibilidade em mudanças futuras"],
];

const aceite = [
  "Descreve objetivo, escopo e público.",
  "Explica perfis e permissões.",
  "Documenta fluxos principais.",
  "Apresenta arquitetura e dados.",
  "Informa links de API e ambientes.",
  "Descreve segurança, auditoria e operação.",
  "Inclui comandos de execução e QA.",
  "Lista limitações conhecidas.",
  "Não contém segredos.",
  "Foi revisada por alguém responsável pelo projeto.",
];

const glossario = [
  ["BFF", "Backend for Frontend, camada Next.js /api entre interface e FastAPI"],
  ["FastAPI", "Framework Python usado no backend"],
  ["OpenAPI", "Especificação JSON dos endpoints da API"],
  ["Swagger", "Interface interativa para explorar a API"],
  ["Simulado", "Prova aplicada a alunos/candidatos"],
  ["Questão", "Item com enunciado, alternativas e resposta correta"],
  ["Auditoria", "Registro de ações relevantes"],
  ["RBAC", "Controle de acesso baseado em papéis/perfis"],
  ["Supabase", "Serviço usado como PostgreSQL principal em produção"],
  ["Heurística local", "Regra calculada no backend sem provedor externo de IA"],
];

const relacionados = [
  ["README.md", "Visão geral técnica do projeto"],
  ["backend/README.md", "Informações específicas do backend"],
  ["docs/postman-fluxo-backend.md", "Fluxo principal da API no Postman"],
  ["docs/qa-final.md", "Verificação final local e contra produção"],
  ["docs/mapeamento-dados-backend.md", "Mapeamento de dados entre frontend, backend e banco"],
  ["docs/analise-boas-praticas.md", "Pontos de qualidade, riscos e melhorias"],
];

export default function PaginaDocumentacao() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-marble text-shade dark:bg-shade dark:text-marble">
      <Cabecalho />

      <main>
        <Hero />

        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 md:grid-cols-[240px_1fr] md:px-8 md:py-16">
          <IndiceLateral />

          <div className="min-w-0 space-y-16">
            <Secao id="finalidade" icone={BookOpen} titulo="1. Finalidade do documento">
              <p>
                Este documento descreve a aplicação Simulados SEDU de forma
                funcional, técnica e operacional. Ele deve permitir que alguém
                que não participou do desenvolvimento entenda o problema
                resolvido, os perfis, os fluxos, os dados, as permissões, a
                arquitetura, a operação e os critérios de publicação.
              </p>
              <ListaMarcada
                itens={[
                  "O Swagger documenta endpoints da API.",
                  "Esta página documenta a aplicação como produto de software.",
                  "A linguagem foi pensada para professores, avaliadores e equipe técnica.",
                  "A estrutura segue práticas de arquitetura, documentação de referência e runbooks.",
                ]}
              />
            </Secao>

            <Secao id="identificacao" icone={FileText} titulo="2. Identificação da aplicação">
              <TabelaTresColunas linhas={identificacao.map(([a, b]) => [a, b, ""])} ocultarTerceiraColuna />
            </Secao>

            <Secao id="escopo" icone={ClipboardCheck} titulo="3. Escopo">
              <p>
                O escopo separa o que a aplicação cobre hoje do que não faz
                parte do runtime atual. Isso reduz ambiguidade para análise,
                aceite e evolução do projeto.
              </p>
              <Subtitulo>Dentro do escopo atual</Subtitulo>
              <TabelaTresColunas linhas={escopoAtual.map(([a, b]) => [a, b, ""])} ocultarTerceiraColuna />
              <Subtitulo>Fora do escopo atual</Subtitulo>
              <TabelaTresColunas linhas={foraEscopo.map(([a, b]) => [a, b, ""])} ocultarTerceiraColuna />
            </Secao>

            <Secao id="perfis" icone={Users} titulo="4. Perfis e responsabilidades">
              <p>
                Cada perfil recebe área própria e permissões adequadas à sua
                função. A interface orienta o usuário, mas a autorização real é
                aplicada pelo backend.
              </p>
              <TabelaTresColunas
                cabecalhos={["Perfil", "Responsabilidade funcional", "Restrição principal"]}
                linhas={perfis}
              />
            </Secao>

            <Secao id="requisitos" icone={ListChecks} titulo="5. Requisitos funcionais">
              <p>
                Os requisitos abaixo descrevem o comportamento esperado por
                domínio funcional. Eles servem como referência para avaliação,
                testes e manutenção.
              </p>
              <div className="mt-6 grid gap-5">
                {requisitos.map((grupo) => (
                  <article key={grupo.grupo} className="rounded-md border border-shade/10 bg-white/70 p-5 dark:border-marble/10 dark:bg-marble/5">
                    <h3 className="text-lg font-bold">{grupo.grupo}</h3>
                    <TabelaDuasColunas linhas={grupo.itens} compacta />
                  </article>
                ))}
              </div>
            </Secao>

            <Secao id="regras" icone={KeyRound} titulo="6. Regras de negócio principais">
              <div className="grid gap-4 lg:grid-cols-2">
                {regras.map((regra) => (
                  <CardLista key={regra.titulo} titulo={regra.titulo} itens={regra.itens} />
                ))}
              </div>
            </Secao>

            <Secao id="jornadas" icone={Route} titulo="7. Jornadas de uso">
              <p>
                As jornadas descrevem o percurso completo de uso por perfil e
                ajudam a validar se a aplicação atende ao fluxo real de trabalho.
              </p>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {jornadas.map((jornada) => (
                  <article key={jornada.titulo} className="rounded-md border border-shade/10 bg-lichen p-5 dark:border-marble/10 dark:bg-marble/5">
                    <h3 className="text-lg font-bold">{jornada.titulo}</h3>
                    <ol className="mt-4 space-y-2">
                      {jornada.passos.map((passo, index) => (
                        <li key={passo} className="flex gap-3 text-sm leading-6 text-shade/75 dark:text-marble/75">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-hydrangea text-xs font-bold text-white">
                            {index + 1}
                          </span>
                          <span>{passo}</span>
                        </li>
                      ))}
                    </ol>
                  </article>
                ))}
              </div>
            </Secao>

            <Secao id="arquitetura" icone={Layers3} titulo="8. Arquitetura lógica">
              <p>
                A aplicação segue um desenho em camadas: navegador, frontend,
                BFF, backend FastAPI e PostgreSQL. O frontend não acessa o banco
                diretamente.
              </p>
              <BlocoCodigo
                codigo={`Usuário
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
PostgreSQL`}
              />
              <Subtitulo>Containers principais</Subtitulo>
              <TabelaTresColunas cabecalhos={["Container", "Tecnologia", "Responsabilidade"]} linhas={containers} />
              <Subtitulo>Componentes internos relevantes</Subtitulo>
              <TabelaTresColunas cabecalhos={["Componente", "Caminho", "Responsabilidade"]} linhas={componentes} />
              <Subtitulo>Fluxo técnico de requisição</Subtitulo>
              <ListaNumerada itens={fluxoRequisicao} />
            </Secao>

            <Secao id="api" icone={Network} titulo="9. API e contratos">
              <p>
                A API direta é FastAPI e fica documentada por Swagger/OpenAPI.
                Em produção, o backend direto usa o prefixo{" "}
                <Codigo>/_/backend</Codigo>. A interface web normalmente chama
                o BFF em <Codigo>/api</Codigo>.
              </p>
              <Subtitulo>Links de documentação da API</Subtitulo>
              <TabelaDuasColunas linhas={apiLinks} />
              <Subtitulo>Principais grupos da API</Subtitulo>
              <TabelaDuasColunas linhas={apiGroups} />
              <Subtitulo>Formato de erro normalizado</Subtitulo>
              <BlocoCodigo
                codigo={`{
  "codigo": "VALIDACAO",
  "mensagem": "Dados inválidos. Confira os campos enviados.",
  "detalhes": []
}`}
              />
            </Secao>

            <Secao id="dados" icone={Database} titulo="10. Modelo de dados">
              <p>
                Dados de negócio persistem em PostgreSQL. Estados locais do
                frontend devem se limitar a sessão, preferências visuais e
                estado transitório de interface.
              </p>
              <TabelaDuasColunas linhas={entidades} />
              <ListaMarcada
                itens={[
                  "O frontend não acessa o banco diretamente.",
                  "O backend é responsável por integridade, escopo e autorização.",
                  "A auditoria registra ações relevantes para rastreabilidade.",
                  "PostgreSQL é obrigatório em runtime; SQLite não é fallback da aplicação.",
                ]}
              />
            </Secao>

            <Secao id="seguranca" icone={ShieldCheck} titulo="11. Segurança, privacidade e auditoria">
              <TabelaDuasColunas linhas={seguranca} />
              <Subtitulo>Diretrizes de segurança</Subtitulo>
              <ListaMarcada itens={diretrizesSeguranca} />
              <Subtitulo>Requisitos não funcionais</Subtitulo>
              <TabelaDuasColunas linhas={requisitosNaoFuncionais} />
            </Secao>

            <Secao id="ambientes" icone={Server} titulo="12. Ambientes e configuração">
              <TabelaTresColunas cabecalhos={["Ambiente", "Finalidade", "URL"]} linhas={ambientes} />
              <Subtitulo>Variáveis principais</Subtitulo>
              <TabelaDuasColunas linhas={variaveis} />
              <Subtitulo>Execução e validação</Subtitulo>
              <div className="mt-6 grid gap-4">
                {comandos.map((comando) => (
                  <Comando key={comando.titulo} titulo={comando.titulo} codigo={comando.codigo} />
                ))}
              </div>
            </Secao>

            <Secao id="operacao" icone={Terminal} titulo="13. Operação e runbooks">
              <p>
                Os runbooks abaixo cobrem verificações de saúde, OpenAPI, backup
                local e importação de acervo.
              </p>
              <div className="mt-6 grid gap-4">
                {runbooks.map((runbook) => (
                  <Comando key={runbook.titulo} titulo={runbook.titulo} codigo={runbook.codigo} />
                ))}
              </div>
              <Subtitulo>Troubleshooting</Subtitulo>
              <TabelaTresColunas cabecalhos={["Sintoma", "Causa provável", "Ação recomendada"]} linhas={troubleshooting} />
            </Secao>

            <Secao id="riscos" icone={AlertTriangle} titulo="14. Riscos, limites e aceite">
              <TabelaTresColunas cabecalhos={["Tema", "Situação", "Observação"]} linhas={riscos} />
              <Subtitulo>Critérios de aceite da documentação pública</Subtitulo>
              <ListaMarcada itens={aceite} />
            </Secao>

            <Secao id="glossario" icone={FileCode2} titulo="15. Glossário e documentos relacionados">
              <Subtitulo>Glossário</Subtitulo>
              <TabelaDuasColunas linhas={glossario} />
              <Subtitulo>Documentação relacionada</Subtitulo>
              <TabelaDuasColunas linhas={relacionados} />
              <Subtitulo>Governança</Subtitulo>
              <ListaMarcada
                itens={[
                  "Revisar quando houver novo perfil de usuário.",
                  "Revisar quando houver mudança de permissão, fluxo, banco, API ou deploy.",
                  "Revisar antes de incluir provedor externo de IA.",
                  "Manter a documentação sincronizada com o sistema publicado.",
                ]}
              />
            </Secao>
          </div>
        </div>
      </main>

      <Rodape />
    </div>
  );
}

function Cabecalho() {
  return (
    <header className="sticky top-0 z-40 border-b border-shade/10 bg-marble/85 backdrop-blur-[18px] dark:border-marble/10 dark:bg-shade/85">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:h-[72px] md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-shade dark:text-marble"
          aria-label="Voltar para a página inicial"
        >
          <span className="max-[359px]:sr-only">Simulados</span>
          <span className="text-hydrangea">SEDU</span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Ações">
          <ToggleTema />
          <Link
            href="/"
            className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-shade transition-colors hover:bg-shade/8 dark:text-marble dark:hover:bg-marble/10 sm:inline-flex"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Início
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-shade px-4 py-2.5 text-sm font-bold text-marble transition-all hover:bg-shade/90 active:translate-y-px dark:bg-marble dark:text-shade dark:hover:bg-chartreuse sm:px-5"
          >
            <span className="sm:hidden">Acessar</span>
            <span className="hidden sm:inline">Acessar plataforma</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-shade/10 bg-marble dark:border-marble/10 dark:bg-shade">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1fr_320px] md:px-8 md:py-20">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-hydrangea dark:text-chartreuse">
            Simulados SEDU
          </p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-bold leading-[0.95] text-shade md:text-7xl dark:text-marble">
            Documentação técnica da aplicação
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-[1.65] text-shade/75 md:text-xl dark:text-marble/75">
            Documento funcional, técnico e operacional da plataforma para
            professores, gestores, avaliadores, suporte e equipe técnica.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#finalidade"
              className="inline-flex items-center justify-center rounded-full bg-hydrangea px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-hydrangea/90"
            >
              Ler documentação
            </a>
            <a
              href="https://simulados-sedu.vercel.app/_/backend/docs"
              className="inline-flex items-center gap-2 rounded-full border border-shade/15 px-5 py-3 text-sm font-bold text-shade transition-colors hover:bg-shade/8 dark:border-marble/20 dark:text-marble dark:hover:bg-marble/10"
            >
              Swagger da API
              <ExternalLink className="size-4" aria-hidden />
            </a>
          </div>
        </div>

        <aside className="rounded-md border border-shade/10 bg-lichen p-5 dark:border-marble/10 dark:bg-marble/5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-shade/60 dark:text-marble/60">
            Índice
          </p>
          <nav className="mt-4 grid gap-1" aria-label="Índice da documentação">
            {indice.slice(0, 9).map(([rotulo, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-md px-3 py-2 text-sm font-semibold text-shade/80 transition-colors hover:bg-shade/8 hover:text-shade dark:text-marble/80 dark:hover:bg-marble/10 dark:hover:text-marble"
              >
                {rotulo}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </section>
  );
}

function IndiceLateral() {
  return (
    <aside className="hidden md:block">
      <div className="sticky top-24 border-l border-shade/10 pl-4 dark:border-marble/10">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-shade/50 dark:text-marble/50">
          Nesta página
        </p>
        <nav className="mt-4 grid gap-2" aria-label="Navegação secundária">
          {indice.map(([rotulo, href]) => (
            <a
              key={href}
              href={href}
              className="text-sm font-semibold text-shade/65 transition-colors hover:text-hydrangea dark:text-marble/65 dark:hover:text-chartreuse"
            >
              {rotulo}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function Secao({
  id,
  icone: Icone,
  titulo,
  children,
}: {
  id: string;
  icone: LucideIcon;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-hydrangea/12 text-hydrangea dark:bg-chartreuse/15 dark:text-chartreuse">
          <Icone className="size-5" aria-hidden />
        </span>
        <h2 className="min-w-0 break-words font-serif text-2xl font-bold leading-tight md:text-4xl">
          {titulo}
        </h2>
      </div>
      <div className="w-full max-w-4xl text-base leading-7 text-shade/75 dark:text-marble/75">
        {children}
      </div>
    </section>
  );
}

function Subtitulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-8 text-xl font-bold leading-tight text-shade dark:text-marble">
      {children}
    </h3>
  );
}

function ListaMarcada({ itens }: { itens: string[] }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {itens.map((item) => (
        <div
          key={item}
          className="flex gap-3 rounded-md border border-shade/10 bg-white/70 p-4 text-sm font-semibold leading-6 text-shade/75 dark:border-marble/10 dark:bg-marble/5 dark:text-marble/75"
        >
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-canopy"
            aria-hidden
          />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function ListaNumerada({ itens }: { itens: string[] }) {
  return (
    <ol className="mt-6 grid gap-2">
      {itens.map((item, index) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-shade/75 dark:text-marble/75">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-hydrangea text-xs font-bold text-white">
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function CardLista({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <article className="rounded-md border border-shade/10 bg-white/70 p-5 dark:border-marble/10 dark:bg-marble/5">
      <h3 className="text-lg font-bold text-shade dark:text-marble">{titulo}</h3>
      <ul className="mt-4 space-y-2">
        {itens.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-shade/75 dark:text-marble/75">
            <CheckCircle2 className="mt-1 size-4 shrink-0 text-canopy" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function TabelaDuasColunas({
  linhas,
  compacta = false,
}: {
  linhas: string[][];
  compacta?: boolean;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-md border border-shade/10 bg-white/70 dark:border-marble/10 dark:bg-marble/5">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <tbody>
            {linhas.map(([coluna1, coluna2]) => (
              <tr
                key={`${coluna1}-${coluna2}`}
                className="border-b border-shade/10 last:border-0 dark:border-marble/10"
              >
                <th className="w-52 px-5 py-4 font-bold text-shade dark:text-marble">
                  {coluna1}
                </th>
                <td className={`${compacta ? "py-3" : "py-4"} px-5 leading-6 text-shade/70 dark:text-marble/70`}>
                  {coluna2}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabelaTresColunas({
  linhas,
  cabecalhos = ["Item", "Descrição", "Observação"],
  ocultarTerceiraColuna = false,
}: {
  linhas: string[][];
  cabecalhos?: string[];
  ocultarTerceiraColuna?: boolean;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-md border border-shade/10 bg-white/70 dark:border-marble/10 dark:bg-marble/5">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-shade/5 dark:bg-marble/10">
            <tr>
              {cabecalhos
                .slice(0, ocultarTerceiraColuna ? 2 : 3)
                .map((cabecalho) => (
                  <th key={cabecalho} className="px-5 py-3 font-bold text-shade dark:text-marble">
                    {cabecalho}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr
                key={linha.join("-")}
                className="border-b border-shade/10 last:border-0 dark:border-marble/10"
              >
                <th className="w-56 px-5 py-4 font-bold text-shade dark:text-marble">
                  {linha[0]}
                </th>
                <td className="px-5 py-4 leading-6 text-shade/70 dark:text-marble/70">
                  {linha[1]}
                </td>
                {!ocultarTerceiraColuna && (
                  <td className="px-5 py-4 leading-6 text-shade/70 dark:text-marble/70">
                    {linha[2]}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlocoCodigo({ codigo }: { codigo: string }) {
  return (
    <div className="mt-6 overflow-hidden rounded-md border border-shade/10 bg-shade p-5 text-marble dark:border-marble/10">
      <pre className="whitespace-pre-wrap break-words text-sm leading-7">
        <code>{codigo}</code>
      </pre>
    </div>
  );
}

function Comando({ titulo, codigo }: { titulo: string; codigo: string }) {
  return (
    <article className="rounded-md border border-shade/10 bg-white/70 p-5 dark:border-marble/10 dark:bg-marble/5">
      <div className="mb-3 flex items-center gap-2">
        <MonitorCog className="size-4 text-hydrangea dark:text-chartreuse" aria-hidden />
        <h3 className="font-bold text-shade dark:text-marble">{titulo}</h3>
      </div>
      <BlocoCodigo codigo={codigo} />
    </article>
  );
}

function Codigo({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-shade/8 px-1.5 py-0.5 font-mono text-[0.9em] font-semibold text-shade dark:bg-marble/10 dark:text-marble">
      {children}
    </code>
  );
}

function Rodape() {
  return (
    <footer className="border-t border-shade/10 bg-shade text-marble dark:border-marble/10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
        <p className="text-sm text-marble/70">
          Simulados SEDU · Documentação técnica da aplicação
        </p>
        <div className="flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/" className="text-marble/80 hover:text-chartreuse">
            Página inicial
          </Link>
          <Link href="/login" className="text-marble/80 hover:text-chartreuse">
            Entrar
          </Link>
        </div>
      </div>
    </footer>
  );
}

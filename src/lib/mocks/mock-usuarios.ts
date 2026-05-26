import type { AdaptacaoCognitiva, Usuario } from "@/types";

const NOMES_FEMININOS: string[] = [
  "Ana",
  "Maria",
  "Beatriz",
  "Júlia",
  "Larissa",
  "Letícia",
  "Sofia",
  "Camila",
  "Isabela",
  "Helena",
  "Mariana",
  "Gabriela",
  "Yasmin",
  "Lívia",
  "Clara",
  "Manuela",
  "Lorena",
  "Rafaela",
  "Bianca",
  "Vitória",
  "Alice",
  "Eduarda",
  "Bruna",
  "Nathália",
  "Fernanda",
  "Carolina",
  "Amanda",
  "Pietra",
  "Cecília",
  "Stella",
];

const NOMES_MASCULINOS: string[] = [
  "João",
  "Pedro",
  "Lucas",
  "Gabriel",
  "Mateus",
  "Felipe",
  "Rafael",
  "Bruno",
  "Henrique",
  "Davi",
  "Arthur",
  "Bernardo",
  "Miguel",
  "Daniel",
  "Caio",
  "Gustavo",
  "Vitor",
  "Thiago",
  "Leonardo",
  "Murilo",
  "Enzo",
  "Diego",
  "Eduardo",
  "Igor",
  "Vinícius",
  "Samuel",
  "Heitor",
  "Otávio",
  "Théo",
  "Yuri",
];

const SOBRENOMES: string[] = [
  "Silva",
  "Santos",
  "Oliveira",
  "Souza",
  "Rodrigues",
  "Ferreira",
  "Almeida",
  "Pereira",
  "Lima",
  "Gomes",
  "Costa",
  "Ribeiro",
  "Martins",
  "Carvalho",
  "Alves",
  "Pinto",
  "Moreira",
  "Cardoso",
  "Teixeira",
  "Correia",
  "Mendes",
  "Barbosa",
  "Rocha",
  "Dias",
  "Nunes",
  "Marques",
  "Cavalcanti",
  "Monteiro",
  "Freitas",
  "Castro",
  "Andrade",
  "Vieira",
  "Cruz",
  "Brandão",
  "Coutinho",
];

// Distribuição de adaptações: ~30% dos alunos têm pelo menos uma adaptação.
// Pesos: TDAH mais comum, depois dislexia, depois outras.
const POSSIVEIS_ADAPTACOES: AdaptacaoCognitiva[] = [
  "tdah",
  "tdah",
  "tdah",
  "dislexia",
  "dislexia",
  "discalculia",
  "autismo",
  "deficiencia_visual",
  "deficiencia_auditiva",
];

function gerarAdaptacoesPara(indice: number): AdaptacaoCognitiva[] {
  // determinístico para reprodutibilidade
  const semente = (indice * 31 + 7) % 100;
  if (semente >= 70) {
    return [];
  }
  const principal = POSSIVEIS_ADAPTACOES[semente % POSSIVEIS_ADAPTACOES.length];
  // 8% dos alunos com adaptação têm uma segunda adaptação combinada
  if (semente % 13 === 0) {
    const secundaria =
      POSSIVEIS_ADAPTACOES[(semente + 4) % POSSIVEIS_ADAPTACOES.length];
    if (secundaria !== principal) {
      return [principal, secundaria];
    }
  }
  return [principal];
}

function nomeAluno(indice: number): string {
  const eFeminino = indice % 2 === 0;
  const lista = eFeminino ? NOMES_FEMININOS : NOMES_MASCULINOS;
  const nome = lista[indice % lista.length];
  const sobrenome1 = SOBRENOMES[(indice * 7) % SOBRENOMES.length];
  const sobrenome2 = SOBRENOMES[(indice * 11 + 3) % SOBRENOMES.length];
  return `${nome} ${sobrenome1} ${sobrenome2}`;
}

function emailDeAluno(nomeCompleto: string, indice: number): string {
  const partes = nomeCompleto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(" ");
  const primeiro = partes[0];
  const ultimo = partes[partes.length - 1];
  return `${primeiro}.${ultimo}${indice}@aluno.sedu.es.gov.br`;
}

function ultimoAcessoVariado(indice: number): string {
  // Distribui últimos acessos em datas e horários comerciais variados.
  const dia = 28 - (indice % 14); // entre 14 e 28 de abril 2026
  const hora = 8 + ((indice * 3) % 14); // 08h-21h
  const minuto = (indice * 7) % 60;
  return `2026-04-${String(dia).padStart(2, "0")}T${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}:00-03:00`;
}

function avatarUrl(id: string): string {
  return `https://api.dicebear.com/7.x/avataaars-neutral/svg?seed=${id}`;
}

// Mapeamento turma → escola para alunos (em sequência de 10 em 10).
// usu_100..109 → tur_001 (esc_001), usu_110..119 → tur_002 (esc_001), etc.
const TURMAS_POR_BLOCO: Array<{ turmaId: string; escolaId: string }> = [
  { turmaId: "tur_001", escolaId: "esc_001" },
  { turmaId: "tur_002", escolaId: "esc_001" },
  { turmaId: "tur_003", escolaId: "esc_001" },
  { turmaId: "tur_004", escolaId: "esc_001" },
  { turmaId: "tur_005", escolaId: "esc_002" },
  { turmaId: "tur_006", escolaId: "esc_002" },
  { turmaId: "tur_007", escolaId: "esc_002" },
  { turmaId: "tur_008", escolaId: "esc_002" },
  { turmaId: "tur_009", escolaId: "esc_003" },
  { turmaId: "tur_010", escolaId: "esc_003" },
  { turmaId: "tur_011", escolaId: "esc_003" },
  { turmaId: "tur_012", escolaId: "esc_003" },
  { turmaId: "tur_013", escolaId: "esc_004" },
  { turmaId: "tur_014", escolaId: "esc_004" },
  { turmaId: "tur_015", escolaId: "esc_004" },
  { turmaId: "tur_016", escolaId: "esc_004" },
  { turmaId: "tur_017", escolaId: "esc_005" },
  { turmaId: "tur_018", escolaId: "esc_005" },
  { turmaId: "tur_019", escolaId: "esc_005" },
  { turmaId: "tur_020", escolaId: "esc_005" },
];

function gerarAlunos(): Usuario[] {
  const alunos: Usuario[] = [];
  for (let indice = 0; indice < 200; indice += 1) {
    const numero = 100 + indice;
    const id = `usu_${String(numero).padStart(3, "0")}`;
    const blocoTurma = TURMAS_POR_BLOCO[Math.floor(indice / 10)];
    const nome = nomeAluno(indice);
    alunos.push({
      id,
      nome,
      email: emailDeAluno(nome, numero),
      perfil: "aluno",
      fotoUrl: avatarUrl(id),
      escolaId: blocoTurma.escolaId,
      turmaIds: [blocoTurma.turmaId],
      adaptacoes: gerarAdaptacoesPara(indice),
      ativo: indice % 47 !== 0, // ~2% inativos
      criadoEm: "2026-02-10T09:00:00-03:00",
      atualizadoEm: "2026-04-15T11:30:00-03:00",
      ultimoAcesso: ultimoAcessoVariado(indice),
    });
  }
  return alunos;
}

const adminsEGestores: Usuario[] = [
  // ADMINS — Secretaria
  {
    id: "usu_001",
    nome: "Renata Albuquerque Cardoso",
    email: "renata.cardoso@sedu.es.gov.br",
    perfil: "admin",
    fotoUrl: avatarUrl("usu_001"),
    ativo: true,
    criadoEm: "2024-01-15T08:00:00-03:00",
    atualizadoEm: "2026-04-28T17:42:00-03:00",
    ultimoAcesso: "2026-05-07T16:18:00-03:00",
  },
  {
    id: "usu_002",
    nome: "Marcelo Antônio Ribeiro",
    email: "marcelo.ribeiro@sedu.es.gov.br",
    perfil: "admin",
    fotoUrl: avatarUrl("usu_002"),
    ativo: true,
    criadoEm: "2024-01-15T08:05:00-03:00",
    atualizadoEm: "2026-04-26T10:22:00-03:00",
    ultimoAcesso: "2026-05-08T09:14:00-03:00",
  },

  // GESTORES — Escola 1 (Maria Ortiz / Vitória) — 3 gestores
  {
    id: "usu_003",
    nome: "Patrícia Mendonça Vieira",
    email: "patricia.vieira@sedu.es.gov.br",
    perfil: "gestor",
    fotoUrl: avatarUrl("usu_003"),
    escolaId: "esc_001",
    ativo: true,
    criadoEm: "2024-02-08T08:30:00-03:00",
    atualizadoEm: "2026-04-22T15:00:00-03:00",
    ultimoAcesso: "2026-05-08T08:42:00-03:00",
  },
  {
    id: "usu_004",
    nome: "Carlos Eduardo Tavares",
    email: "carlos.tavares@sedu.es.gov.br",
    perfil: "gestor",
    fotoUrl: avatarUrl("usu_004"),
    escolaId: "esc_001",
    ativo: true,
    criadoEm: "2024-02-08T08:35:00-03:00",
    atualizadoEm: "2026-04-20T11:15:00-03:00",
    ultimoAcesso: "2026-05-07T14:27:00-03:00",
  },
  {
    id: "usu_005",
    nome: "Fernanda Lúcia Bittencourt",
    email: "fernanda.bittencourt@sedu.es.gov.br",
    perfil: "gestor",
    fotoUrl: avatarUrl("usu_005"),
    escolaId: "esc_001",
    ativo: true,
    criadoEm: "2024-02-08T08:40:00-03:00",
    atualizadoEm: "2026-04-19T16:48:00-03:00",
    ultimoAcesso: "2026-05-08T10:05:00-03:00",
  },

  // GESTORES — Escola 2 (Coronel Gomes / Cachoeiro) — 2 gestores
  {
    id: "usu_006",
    nome: "Ricardo Silveira Pacheco",
    email: "ricardo.pacheco@sedu.es.gov.br",
    perfil: "gestor",
    fotoUrl: avatarUrl("usu_006"),
    escolaId: "esc_002",
    ativo: true,
    criadoEm: "2024-02-15T09:00:00-03:00",
    atualizadoEm: "2026-04-18T13:22:00-03:00",
    ultimoAcesso: "2026-05-07T17:33:00-03:00",
  },
  {
    id: "usu_007",
    nome: "Joana Carla Figueiredo",
    email: "joana.figueiredo@sedu.es.gov.br",
    perfil: "gestor",
    fotoUrl: avatarUrl("usu_007"),
    escolaId: "esc_002",
    ativo: true,
    criadoEm: "2024-02-15T09:10:00-03:00",
    atualizadoEm: "2026-04-17T10:08:00-03:00",
    ultimoAcesso: "2026-05-08T07:52:00-03:00",
  },

  // GESTORES — Escola 3 (Linhares Rural) — 1 gestor
  {
    id: "usu_008",
    nome: "Antônio Carlos Brandão",
    email: "antonio.brandao@sedu.es.gov.br",
    perfil: "gestor",
    fotoUrl: avatarUrl("usu_008"),
    escolaId: "esc_003",
    ativo: true,
    criadoEm: "2024-03-06T11:30:00-03:00",
    atualizadoEm: "2026-04-12T17:00:00-03:00",
    ultimoAcesso: "2026-05-06T15:18:00-03:00",
  },

  // GESTORES — Escola 4 (Lélia Almeida / Vila Velha) — 2 gestores
  {
    id: "usu_009",
    nome: "Lúcia Helena Marques",
    email: "lucia.marques@sedu.es.gov.br",
    perfil: "gestor",
    fotoUrl: avatarUrl("usu_009"),
    escolaId: "esc_004",
    ativo: true,
    criadoEm: "2024-02-21T08:00:00-03:00",
    atualizadoEm: "2026-04-25T10:42:00-03:00",
    ultimoAcesso: "2026-05-08T08:18:00-03:00",
  },
  {
    id: "usu_010",
    nome: "Diego Henrique Pacheco",
    email: "diego.pacheco@sedu.es.gov.br",
    perfil: "gestor",
    fotoUrl: avatarUrl("usu_010"),
    escolaId: "esc_004",
    ativo: true,
    criadoEm: "2024-02-21T08:10:00-03:00",
    atualizadoEm: "2026-04-23T14:55:00-03:00",
    ultimoAcesso: "2026-05-07T11:22:00-03:00",
  },

  // GESTORES — Escola 5 (Silas Neves / Serra) — 1 gestor
  {
    id: "usu_011",
    nome: "Sandra Regina Alvarenga",
    email: "sandra.alvarenga@sedu.es.gov.br",
    perfil: "gestor",
    fotoUrl: avatarUrl("usu_011"),
    escolaId: "esc_005",
    ativo: true,
    criadoEm: "2024-03-13T13:45:00-03:00",
    atualizadoEm: "2026-04-20T11:20:00-03:00",
    ultimoAcesso: "2026-05-08T09:48:00-03:00",
  },
];

const suportes: Usuario[] = [
  {
    id: "usu_211",
    nome: "Roberto Carlos Nogueira",
    email: "roberto.nogueira@sedu.es.gov.br",
    perfil: "suporte",
    fotoUrl: avatarUrl("usu_211"),
    ativo: true,
    criadoEm: "2024-04-02T10:00:00-03:00",
    atualizadoEm: "2026-04-26T13:11:00-03:00",
    ultimoAcesso: "2026-05-08T08:30:00-03:00",
  },
  {
    id: "usu_212",
    nome: "Mariana Pires de Oliveira",
    email: "mariana.pires@sedu.es.gov.br",
    perfil: "suporte",
    fotoUrl: avatarUrl("usu_212"),
    ativo: true,
    criadoEm: "2024-04-02T10:05:00-03:00",
    atualizadoEm: "2026-04-24T15:38:00-03:00",
    ultimoAcesso: "2026-05-07T16:55:00-03:00",
  },
  {
    id: "usu_213",
    nome: "Eduardo Vinícius Lacerda",
    email: "eduardo.lacerda@sedu.es.gov.br",
    perfil: "suporte",
    fotoUrl: avatarUrl("usu_213"),
    ativo: true,
    criadoEm: "2024-04-02T10:10:00-03:00",
    atualizadoEm: "2026-04-22T17:42:00-03:00",
    ultimoAcesso: "2026-05-08T10:14:00-03:00",
  },
  {
    id: "usu_214",
    nome: "Tatiana Souza Mascarenhas",
    email: "tatiana.mascarenhas@sedu.es.gov.br",
    perfil: "suporte",
    fotoUrl: avatarUrl("usu_214"),
    ativo: true,
    criadoEm: "2024-04-02T10:15:00-03:00",
    atualizadoEm: "2026-04-21T09:08:00-03:00",
    ultimoAcesso: "2026-05-07T14:48:00-03:00",
  },
  {
    id: "usu_215",
    nome: "Felipe Augusto Damasceno",
    email: "felipe.damasceno@sedu.es.gov.br",
    perfil: "suporte",
    fotoUrl: avatarUrl("usu_215"),
    ativo: true,
    criadoEm: "2024-04-02T10:20:00-03:00",
    atualizadoEm: "2026-04-19T16:25:00-03:00",
    ultimoAcesso: "2026-05-08T07:38:00-03:00",
  },
];

export const mockUsuarios: Usuario[] = [
  ...adminsEGestores,
  ...gerarAlunos(),
  ...suportes,
];

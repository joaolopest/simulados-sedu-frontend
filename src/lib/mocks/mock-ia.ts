import type {
  DiagnosticoSimulado,
  FatorRisco,
  InsightIA,
  MensagemResultadoIA,
  PrevisaoRiscoAluno,
  SugestaoReforco,
} from "@/types";

// ============================================================================
// DIAGNÓSTICOS EDITORIAIS — 5 simulados
// Voz: institucional + analítica + acolhedora. Português brasileiro.
// ============================================================================

export const mockDiagnosticos: DiagnosticoSimulado[] = [
  {
    id: "dia_001",
    simuladoId: "sim_009",
    resumoExecutivo:
      "O simulado bimestral de Português aplicado à turma do 9º ano A revelou um quadro de desempenho consistente, com nota média de 6,7 — ligeiramente acima da média estadual para a mesma série. O grupo demonstrou domínio sólido em interpretação de texto poético e identificação de figuras de linguagem, indicando que o trabalho com literatura ao longo do bimestre vem rendendo frutos perceptíveis.\n\nAs maiores dificuldades concentraram-se na análise de pontuação como recurso de sentido, especialmente no isolamento de apostos. Cerca de 38% da turma errou a questão 6, sugerindo que a relação entre estrutura sintática e função expressiva da pontuação ainda não está plenamente consolidada. Esse padrão também aparece no tempo médio de resposta dessa questão — 142 segundos contra a estimativa de 100 — indicando hesitação genuína, não apenas erro por descuido.\n\nPor fim, observa-se uma diferença marcada entre o desempenho de alunos com e sem adaptação para dislexia: os primeiros ficaram, em média, 1,2 pontos abaixo. Esse resultado, embora dentro do esperado, reforça a importância de revisitar a apresentação de estímulos textuais para o grupo.",
    pontosFortes: [
      "Desempenho acima da média estadual em competência EF09LP07 (interpretação de texto poético) — taxa de acerto de 78%.",
      "Identificação correta de metáfora pela esmagadora maioria (questão 8) — sinal de boa apropriação do conteúdo de figuras de linguagem.",
      "Tempo de resposta dentro do estimado em três das quatro questões — indica fluência leitora estabelecida na turma.",
      "Engajamento alto: 100% dos 25 alunos responderam todas as questões, sem questões em branco.",
    ],
    pontosAtencao: [
      "Pontuação como recurso expressivo (EF09LP04) ficou 14 pontos percentuais abaixo da média estadual.",
      "Alunos com adaptação para dislexia apresentaram queda de desempenho proporcionalmente maior em questões com texto longo.",
      "Cinco alunos (20% da turma) ficaram com nota inferior a 5,0 — risco de defasagem se não houver intervenção.",
      "Questão 4 (charge) gerou padrão de erro consistente no grupo — possível dificuldade com leitura intersemiótica.",
    ],
    recomendacoesPedagogicas: [
      "Retomar pontuação em sala com foco específico em apostos e vocativos, usando textos da imprensa local capixaba como material concreto.",
      "Disponibilizar versão em fonte para dislexia das próximas avaliações para os alunos cadastrados — três alunos já foram identificados.",
      "Incluir uma sequência didática curta (4 aulas) sobre charges, tirinhas e leitura intersemiótica.",
      "Acompanhamento individualizado para os cinco alunos com nota inferior a 5,0 — recomenda-se reunião com famílias dentro de 15 dias.",
      "Sugerir parceria com biblioteca da escola para reforço de leitura literária — o desempenho em interpretação poética indica turma receptiva ao trabalho com texto autoral.",
    ],
    geradoEm: "2026-04-15T19:42:00-03:00",
    modeloUsado: "claude-opus-4-7",
    confiancaPercentual: 91,
  },
  {
    id: "dia_002",
    simuladoId: "sim_010",
    resumoExecutivo:
      "A aplicação do simulado bimestral de Matemática à turma do 9º ano A trouxe um resultado preocupante e que merece resposta pedagógica imediata. A nota média foi de 6,1, com dispersão alta — desvio-padrão de 1,9 — sinalizando que a turma não responde de forma homogênea aos conteúdos avaliados. Há um subgrupo claro de cerca de seis alunos com desempenho consistente acima de 8,0 e outro, igualmente nítido, com cinco alunos abaixo de 4,5.\n\nAs questões de função afim (EF09MA06) e Teorema de Pitágoras (EF09MA14) mantiveram-se dentro do esperado, embora com tempo de resposta acima do estimado — sinal de que o grupo resolve, mas com esforço cognitivo elevado. Já a questão de análise combinatória (EM13MAT310) gerou alto índice de erro, o que é compatível com o fato de o conteúdo ainda estar sendo introduzido nesta série.\n\nÉ importante registrar que a curadoria do simulado precisou de quatro tentativas para atingir a distribuição alvo, refletindo aperto no banco de questões para o 9º ano. Recomenda-se ampliar o acervo antes do próximo bimestre.",
    pontosFortes: [
      "Subgrupo de seis alunos demonstrou domínio consolidado em função afim — possível ponto de partida para projetos de monitoria entre pares.",
      "Tempo de resolução de Pitágoras compatível com aprendizado em consolidação — 70% acertaram.",
      "Trocas de resposta baixas (média 1,3 por questão) — turma responde com convicção, mesmo quando erra.",
      "Engajamento mantido até o final do simulado, sem casos de tempo esgotado.",
    ],
    pontosAtencao: [
      "Cinco alunos com desempenho abaixo de 4,5 — risco real de defasagem em conteúdo estruturante para o 1º ano do Ensino Médio.",
      "Análise combinatória apresentou taxa de erro de 60% — conteúdo merece revisão antes da avaliação somativa.",
      "Quatro alunos deixaram a última questão (mais difícil) em branco — pode indicar gestão de tempo problemática ou desistência.",
      "Alunos com adaptação para discalculia ficaram, em média, 1,8 pontos abaixo dos demais — gap maior do que o esperado para a turma.",
    ],
    recomendacoesPedagogicas: [
      "Reforço imediato em análise combinatória com abordagem por contagem e árvore de possibilidades antes de fórmulas.",
      "Implementar atividades em duplas heterogêneas usando os alunos com desempenho alto como apoio aos colegas — modelo \"sala que ensina\".",
      "Reunião com a coordenação pedagógica em até 7 dias para discutir os cinco alunos em risco.",
      "Para alunos com discalculia: ampliar tempo de prova em 30% e oferecer materiais com representações visuais e manipulativas.",
      "Solicitar à SEDU a ampliação do banco de questões de matemática do 9º ano — registro de aperto formal já documentado na curadoria.",
      "Considerar avaliação diagnóstica complementar focada em frações e operações básicas para o subgrupo em risco.",
    ],
    geradoEm: "2026-04-22T19:38:00-03:00",
    modeloUsado: "claude-opus-4-7",
    confiancaPercentual: 87,
  },
  {
    id: "dia_003",
    simuladoId: "sim_007",
    resumoExecutivo:
      "O simulado diagnóstico de Matemática do 7º ano B, ainda em andamento no momento desta análise preliminar, traz indícios encorajadores. Dos 6 alunos que já finalizaram, a média parcial está em 7,2 — patamar alto para uma avaliação inicial de bimestre. As questões de porcentagem e equações do 1º grau, conteúdos centrais do bloco em curso, estão apresentando taxa de acerto superior a 75%.\n\nO grupo parece chegar com uma base sólida em operações com decimais, o que é uma boa notícia considerando que esse conteúdo costuma ser ponto frágil em diagnósticos de início de ano. A questão 1 (Marina e os cadernos) — clássico contexto de modelagem — foi acertada por todos os respondentes até agora.\n\nÉ cedo para conclusões definitivas, mas vale registrar que o tempo médio de resposta está cerca de 18% abaixo do estimado, o que pode indicar tanto fluência quanto pressa — recomenda-se acompanhar tempo até a conclusão pelos demais alunos antes de fechar a leitura.",
    pontosFortes: [
      "Acerto de 100% na questão de operações com decimais — base operatória aparentemente consolidada.",
      "Boa performance em porcentagem (75%) — conteúdo central do bimestre.",
      "Engajamento total: nenhum aluno desconectou ou desistiu até o momento da leitura.",
      "Tempo de resposta abaixo do estimado, sugerindo fluência matemática.",
    ],
    pontosAtencao: [
      "Apenas 6 dos 10 alunos finalizaram — leitura ainda parcial.",
      "Tempo abaixo do estimado pode também indicar pressa — vale conferir trocas de resposta no fechamento.",
      "Equação do 1º grau com taxa um pouco menor que porcentagem — vale acompanhamento.",
    ],
    recomendacoesPedagogicas: [
      "Aguardar finalização para diagnóstico completo — projeção otimista, mas preliminar.",
      "Caso o desempenho final se mantenha alto, considerar avançar o cronograma para incluir tópicos do 8º ano em projetos de extensão.",
      "Criar uma lista curta de \"alunos potenciais para olimpíada\" caso a turma confirme o padrão atual.",
      "Verificar com o professor titular se o pré-trabalho com decimais foi enfatizado — possível boa prática a ser registrada.",
    ],
    geradoEm: "2026-05-08T11:28:00-03:00",
    modeloUsado: "claude-opus-4-7",
    confiancaPercentual: 68,
  },
  {
    id: "dia_004",
    simuladoId: "sim_005",
    resumoExecutivo:
      "O simulado de História do 8º ano B, recém-liberado, ainda não conta com volume de respostas suficiente para diagnóstico estatístico robusto. Esta nota técnica registra apenas as expectativas iniciais com base na curadoria e nos parâmetros do simulado.\n\nO conjunto de questões selecionadas estrutura uma narrativa cronológica coerente — da chegada portuguesa (1500) à abolição (1888) — passando por escravidão e independência. É um arco temporal denso, mas pedagogicamente bem articulado: cada questão constrói sobre o entendimento da anterior, o que tende a beneficiar alunos com pensamento histórico contextual.\n\nDuas das quatro questões trazem adaptação para dislexia — um cuidado importante dado que a turma tem dois alunos cadastrados com essa adaptação. Recomenda-se observar o tempo de resposta desses alunos em particular: se mostrar-se compatível com a média do grupo, é sinal de que as adaptações estão funcionando como suporte cognitivo, não como compensação de defasagem.",
    pontosFortes: [
      "Curadoria com confiança alta (88%) e distribuição alcançada na primeira tentativa.",
      "Recorte temático coerente — narrativa histórica com começo, meio e fim conceitual.",
      "Adaptações para dislexia já incluídas em duas questões.",
      "Alinhamento com competências EF07HI09, EF08HI04 e EF08HI21.",
    ],
    pontosAtencao: [
      "Aplicação ainda no início — análise estatística ficará disponível após 80% de finalização.",
      "Questão sobre Lei Áurea (que_036) tende a gerar discussões — tema delicado e historicamente carregado.",
      "Acompanhar tempo dos alunos com dislexia para validação das adaptações.",
    ],
    recomendacoesPedagogicas: [
      "Reservar uma aula para discussão crítica da Lei Áurea após aplicação — questão tende a abrir conversa rica sobre racismo estrutural.",
      "Coletar feedback qualitativo dos alunos sobre as adaptações de dislexia ao final.",
      "Considerar uso do simulado como diagnóstico para sequência didática sobre Brasil República.",
      "Analisar tempo de resposta dos alunos em risco antes de avaliação somativa do bimestre.",
    ],
    geradoEm: "2026-05-09T14:42:00-03:00",
    modeloUsado: "claude-opus-4-7",
    confiancaPercentual: 62,
  },
  {
    id: "dia_005",
    simuladoId: "sim_004",
    resumoExecutivo:
      "O simulado SAEB de Linguagens para o 6º ano A da EEEFM Maria Ortiz, recentemente liberado, foi construído com uma distribuição de dificuldade consciente — quatro questões fáceis e quatro médias, sem nenhuma difícil. Essa escolha é pedagogicamente apropriada para um simulado com função de calibragem inicial: queremos identificar pontos de partida, não selecionar.\n\nO foco em classes de palavras, ortografia e figuras de linguagem reflete competências fundacionais do ciclo, e o tempo previsto de 50 minutos para 8 questões deixa margem confortável para alunos com adaptações cognitivas — três das quais foram contempladas no parâmetro do simulado (TDAH, dislexia e deficiência visual).\n\nA expectativa é que o simulado revele um panorama claro do nível em que a turma chega ao bimestre, oferecendo aos professores uma fotografia útil para personalização de plano de aula.",
    pontosFortes: [
      "Curadoria com confiança de 91% na primeira tentativa — distribuição calibrada.",
      "Tempo confortável (~6 min/questão) acomoda alunos com adaptações.",
      "Conteúdos selecionados são fundacionais para o ciclo — boa escolha para diagnóstico.",
      "Inclusão de adaptação para deficiência visual sinaliza atenção real à acessibilidade.",
    ],
    pontosAtencao: [
      "Ausência de questões difíceis pode subestimar o teto da turma — reservar próxima avaliação para identificar alunos avançados.",
      "Aplicação de longa duração (de 9 a 15 de maio) — necessário garantir uniformidade de condições entre os dias.",
    ],
    recomendacoesPedagogicas: [
      "Aplicar este simulado como linha de base para o bimestre, e não como nota — comunicar isso aos alunos para reduzir ansiedade.",
      "Ao analisar os resultados, separar os dados por adaptação cognitiva para ajustes específicos.",
      "Planejar um simulado complementar com 2-3 questões difíceis em até 30 dias para identificar alunos com maior potencial.",
      "Compartilhar o relatório com os professores das outras matérias da turma — diagnóstico de Linguagens costuma ser bom preditor geral.",
    ],
    geradoEm: "2026-05-08T17:18:00-03:00",
    modeloUsado: "claude-opus-4-7",
    confiancaPercentual: 84,
  },
];

// ============================================================================
// PREVISÕES DE RISCO — 25 alunos
// ============================================================================

const FATORES_RISCO_BASE: FatorRisco[] = [
  {
    fator: "queda_desempenho",
    peso: 0.32,
    descricao: "Queda de mais de 1,5 ponto na média entre dois últimos simulados.",
  },
  {
    fator: "frequencia_acessos",
    peso: 0.18,
    descricao: "Acessos à plataforma reduzidos para menos de uma vez por semana.",
  },
  {
    fator: "tempo_resposta",
    peso: 0.14,
    descricao: "Tempo de resposta consistentemente acima do estimado — possível dificuldade cognitiva.",
  },
  {
    fator: "questoes_em_branco",
    peso: 0.21,
    descricao: "Mais de 20% das questões deixadas em branco nos últimos simulados.",
  },
  {
    fator: "competencias_basicas",
    peso: 0.28,
    descricao: "Defasagem em competências fundacionais (leitura, operações básicas).",
  },
  {
    fator: "engajamento_baixo",
    peso: 0.16,
    descricao: "Pouca interação com materiais de reforço sugeridos.",
  },
  {
    fator: "adaptacao_nao_atendida",
    peso: 0.22,
    descricao: "Adaptação cognitiva cadastrada não está sendo plenamente atendida em sala.",
  },
];

function gerarFatores(indice: number): FatorRisco[] {
  const quantidade = 3 + (indice % 3); // 3, 4 ou 5 fatores
  const inicio = indice % FATORES_RISCO_BASE.length;
  const fatores: FatorRisco[] = [];
  for (let i = 0; i < quantidade; i += 1) {
    fatores.push(FATORES_RISCO_BASE[(inicio + i) % FATORES_RISCO_BASE.length]);
  }
  return fatores;
}

const TENDENCIAS: Array<"subindo" | "estavel" | "caindo"> = [
  "caindo",
  "estavel",
  "caindo",
  "caindo",
  "estavel",
  "subindo",
  "caindo",
  "estavel",
  "caindo",
  "estavel",
  "subindo",
  "caindo",
  "estavel",
  "caindo",
  "subindo",
  "estavel",
  "caindo",
  "estavel",
  "subindo",
  "caindo",
  "estavel",
  "subindo",
  "caindo",
  "estavel",
  "subindo",
];

const RECOMENDACOES_RISCO: string[][] = [
  [
    "Conversa individual com a coordenação pedagógica em até 7 dias.",
    "Acompanhamento semanal de presença e engajamento.",
    "Acionar família para reunião conjunta com a escola.",
  ],
  [
    "Disponibilizar materiais de reforço em frações e operações básicas.",
    "Sugerir grupo de estudos com colegas de bom desempenho.",
    "Avaliar se as adaptações cognitivas cadastradas estão sendo atendidas.",
  ],
  [
    "Plano de recuperação personalizado em interpretação textual.",
    "Reforço extra de leitura literária juvenil.",
    "Acompanhamento mensal com diagnóstico curto.",
  ],
  [
    "Mentoria entre pares com aluno de turma vizinha.",
    "Reorganização do horário de estudo em casa, junto à família.",
    "Foco em competências EF09LP02 e EF09MA14 para próximo simulado.",
  ],
];

function gerarPrevisoesRisco(): PrevisaoRiscoAluno[] {
  // 12 alta probabilidade, 8 média, 5 baixa.
  // Seleciona 25 alunos da turma 7 (usu_160 a usu_184).
  const previsoes: PrevisaoRiscoAluno[] = [];
  for (let indice = 0; indice < 25; indice += 1) {
    const alunoId = `usu_${String(160 + indice).padStart(3, "0")}`;
    let probEvasao: number;
    let probReprovacao: number;

    if (indice < 12) {
      // alta probabilidade
      probEvasao = 0.45 + ((indice * 7) % 35) / 100;
      probReprovacao = 0.55 + ((indice * 11) % 30) / 100;
    } else if (indice < 20) {
      // média
      probEvasao = 0.2 + ((indice * 13) % 20) / 100;
      probReprovacao = 0.3 + ((indice * 17) % 25) / 100;
    } else {
      // baixa
      probEvasao = 0.05 + ((indice * 11) % 12) / 100;
      probReprovacao = 0.08 + ((indice * 7) % 14) / 100;
    }

    const competenciasFracas =
      indice < 12
        ? ["EF09MA06", "EF09LP04", "EF09LP02"]
        : indice < 20
          ? ["EF09MA14", "EF09LP07"]
          : ["EM13MAT310"];

    previsoes.push({
      alunoId,
      probabilidadeEvasao: Number(probEvasao.toFixed(2)),
      probabilidadeReprovacao: Number(probReprovacao.toFixed(2)),
      fatoresContribuintes: gerarFatores(indice),
      tendencia: TENDENCIAS[indice],
      ultimaAtualizacao: `2026-05-0${(indice % 7) + 1}T${10 + (indice % 8)}:${String((indice * 13) % 60).padStart(2, "0")}:00-03:00`,
      competenciasFracas,
      recomendacoes: RECOMENDACOES_RISCO[indice % RECOMENDACOES_RISCO.length],
    });
  }
  return previsoes;
}

export const mockPrevisoesRisco: PrevisaoRiscoAluno[] = gerarPrevisoesRisco();

// ============================================================================
// SUGESTÕES DE REFORÇO — 30 itens
// ============================================================================

export const mockSugestoesReforco: SugestaoReforco[] = [
  {
    competencia: "EF09LP04",
    conteudo: "Pontuação como recurso de sentido",
    tipoMaterial: "video",
    url: "https://www.youtube.com/watch?v=mock-pontuacao-9ano",
    descricao:
      "Aula de 18 minutos com foco em vírgula isolando aposto e vocativo, com exercícios práticos.",
  },
  {
    competencia: "EF09MA06",
    conteudo: "Função afim — leitura de gráficos",
    tipoMaterial: "exercicio",
    url: "https://exercicios.sedu.es.gov.br/funcao-afim-9ano",
    descricao:
      "Lista com 12 exercícios graduados sobre função afim, indo de identificação de coeficientes a problemas contextualizados.",
  },
  {
    competencia: "EF09MA14",
    conteudo: "Teorema de Pitágoras na arquitetura",
    tipoMaterial: "video",
    url: "https://www.youtube.com/watch?v=mock-pitagoras",
    descricao:
      "Vídeo curto (8 min) mostrando o uso de Pitágoras na construção civil — aplicação concreta do teorema.",
  },
  {
    competencia: "EF09LP02",
    conteudo: "Análise de poemas modernos brasileiros",
    tipoMaterial: "texto",
    url: "https://leituras.sedu.es.gov.br/poesia-moderna-br",
    descricao:
      "Coletânea comentada de 8 poemas brasileiros do século XX, com perguntas norteadoras de leitura.",
  },
  {
    competencia: "EM13MAT310",
    conteudo: "Análise combinatória — princípio multiplicativo",
    tipoMaterial: "atividade",
    url: "https://atividades.sedu.es.gov.br/combinatoria-introducao",
    descricao:
      "Atividade lúdica com cards e tabuleiro para introduzir contagem antes de fórmulas. Tempo estimado: 50 min.",
  },
  {
    competencia: "EF06LP04",
    conteudo: "Classes de palavras — advérbio",
    tipoMaterial: "video",
    url: "https://www.youtube.com/watch?v=mock-adverbios",
    descricao: "Aula objetiva de 12 minutos sobre o que é advérbio e como diferenciar de adjetivo.",
  },
  {
    competencia: "EF06MA13",
    conteudo: "Operações com decimais — situações cotidianas",
    tipoMaterial: "exercicio",
    url: "https://exercicios.sedu.es.gov.br/decimais-cotidiano",
    descricao:
      "10 problemas de feira, troco e mercado para fixação de operações com números decimais.",
  },
  {
    competencia: "EF07MA02",
    conteudo: "Porcentagem — descontos e acréscimos",
    tipoMaterial: "atividade",
    descricao:
      "Simulação de loja virtual em sala — alunos calculam descontos e comparam ofertas. Tempo: 1 aula.",
  },
  {
    competencia: "EF08LP06",
    conteudo: "Orações subordinadas substantivas",
    tipoMaterial: "texto",
    url: "https://leituras.sedu.es.gov.br/oracoes-subordinadas",
    descricao:
      "Material de revisão com explicação concisa e 15 exemplos contextualizados de orações substantivas.",
  },
  {
    competencia: "EF08MA19",
    conteudo: "Áreas de figuras planas",
    tipoMaterial: "video",
    url: "https://www.youtube.com/watch?v=mock-areas",
    descricao: "Vídeo de 15 min com derivação visual das fórmulas de área de retângulo, triângulo e trapézio.",
  },
  {
    competencia: "EF06CI09",
    conteudo: "Fotossíntese — experimento simples",
    tipoMaterial: "atividade",
    descricao:
      "Roteiro de experimento com folha de elódea e luz — observação de bolhas de O₂. Material: copo, água, planta.",
  },
  {
    competencia: "EF07CI07",
    conteudo: "Citologia — organelas e funções",
    tipoMaterial: "video",
    url: "https://www.youtube.com/watch?v=mock-organelas",
    descricao: "Aula animada de 14 minutos com analogias do dia a dia (cidade, fábrica) para cada organela.",
  },
  {
    competencia: "EF08CI06",
    conteudo: "Sistema circulatório — animação 3D",
    tipoMaterial: "video",
    url: "https://www.youtube.com/watch?v=mock-circulacao",
    descricao: "Animação 3D de 10 min mostrando o trajeto do sangue entre coração, pulmão e tecidos.",
  },
  {
    competencia: "EF09CI13",
    conteudo: "Vacinação e imunidade — entrevista com pesquisador",
    tipoMaterial: "texto",
    url: "https://leituras.sedu.es.gov.br/imunizacao-fiocruz",
    descricao:
      "Entrevista jornalística com pesquisador da Fiocruz sobre o papel da vacina na saúde pública brasileira.",
  },
  {
    competencia: "EF06HI04",
    conteudo: "Chegada dos portugueses — múltiplas perspectivas",
    tipoMaterial: "texto",
    url: "https://leituras.sedu.es.gov.br/1500-multiplas-vozes",
    descricao:
      "Material com a Carta de Caminha e relatos posteriores indígenas — confronto de perspectivas.",
  },
  {
    competencia: "EF08HI21",
    conteudo: "Pós-abolição e racismo estrutural",
    tipoMaterial: "video",
    url: "https://www.youtube.com/watch?v=mock-posabolicao",
    descricao:
      "Documentário curto (22 min) sobre a vida dos libertos após 1888 e a formação do racismo estrutural brasileiro.",
  },
  {
    competencia: "EF09HI03",
    conteudo: "Revolução Industrial — linha do tempo interativa",
    tipoMaterial: "atividade",
    url: "https://atividades.sedu.es.gov.br/revolucao-industrial",
    descricao: "Linha do tempo interativa com eventos-chave de 1760 a 1900. Atividade autônoma.",
  },
  {
    competencia: "EF07GE07",
    conteudo: "Continentes e populações — mapa interativo",
    tipoMaterial: "atividade",
    url: "https://atividades.sedu.es.gov.br/mapa-mundi-populacao",
    descricao: "Atividade com mapa-múndi interativo para explorar dados populacionais por continente.",
  },
  {
    competencia: "EF08GE10",
    conteudo: "Migração interna no Brasil — depoimentos",
    tipoMaterial: "texto",
    url: "https://leituras.sedu.es.gov.br/migracao-nordeste-sudeste",
    descricao:
      "Coletânea de depoimentos de migrantes nordestinos no Sudeste — material de leitura crítica.",
  },
  {
    competencia: "EF09GE17",
    conteudo: "Ilhas de calor urbano — Vitória/ES",
    tipoMaterial: "texto",
    descricao:
      "Estudo de caso sobre ilhas de calor em Vitória, com mapas de temperatura e áreas verdes da cidade.",
  },
  {
    competencia: "EF06LI09",
    conteudo: "Simple Present — daily routines",
    tipoMaterial: "exercicio",
    url: "https://exercicios.sedu.es.gov.br/simple-present-routines",
    descricao: "20 exercícios sobre Simple Present aplicado a rotinas diárias (he/she/it).",
  },
  {
    competencia: "EF09LI03",
    conteudo: "Present Perfect Continuous — listening",
    tipoMaterial: "video",
    url: "https://www.youtube.com/watch?v=mock-present-perfect",
    descricao: "Vídeo de 12 min com prática de listening focada em Present Perfect Continuous, com legendas.",
  },
  {
    competencia: "EM13LGG704",
    conteudo: "First conditional in real-life situations",
    tipoMaterial: "atividade",
    descricao:
      "Atividade em duplas: criar 5 frases com first conditional sobre planos para o feriado.",
  },
  {
    competencia: "EM13CNT201",
    conteudo: "Cinemática — MRU em pista de corrida",
    tipoMaterial: "video",
    url: "https://www.youtube.com/watch?v=mock-mru",
    descricao:
      "Análise de corrida olímpica de 100m como contexto para cinemática. Vídeo de 9 min.",
  },
  {
    competencia: "EM13CNT203",
    conteudo: "Leis de Newton — experimentos caseiros",
    tipoMaterial: "atividade",
    descricao:
      "Roteiro com 4 experimentos simples ilustrando inércia, F=ma e ação-reação. Material acessível.",
  },
  {
    competencia: "EM13CNT304",
    conteudo: "Estequiometria — passo a passo",
    tipoMaterial: "exercicio",
    url: "https://exercicios.sedu.es.gov.br/estequiometria-passo",
    descricao:
      "Lista de 8 exercícios graduados de estequiometria, do balanceamento até cálculos de rendimento.",
  },
  {
    competencia: "EM13CNT303",
    conteudo: "Tabela periódica — jogo de cartas",
    tipoMaterial: "atividade",
    descricao:
      "Jogo de cartas em duplas para fixar famílias e propriedades dos elementos. Tempo: 30 min.",
  },
  {
    competencia: "EM13MAT302",
    conteudo: "Função quadrática — vértice e raízes",
    tipoMaterial: "video",
    url: "https://www.youtube.com/watch?v=mock-quadratica",
    descricao:
      "Aula de 16 min explorando geometricamente o significado de vértice e raízes da parábola.",
  },
  {
    competencia: "EM13MAT507",
    conteudo: "Progressão geométrica — juros compostos",
    tipoMaterial: "exercicio",
    url: "https://exercicios.sedu.es.gov.br/pg-juros",
    descricao: "Lista que conecta PG a juros compostos, com 10 problemas contextualizados.",
  },
  {
    competencia: "EF08LP10",
    conteudo: "Figuras de linguagem em letras de música brasileira",
    tipoMaterial: "atividade",
    descricao:
      "Análise de 5 letras de música (Caetano, Marisa Monte, Emicida) identificando figuras de linguagem.",
  },
];

// ============================================================================
// INSIGHTS — 15 cards curtos
// ============================================================================

export const mockInsights: InsightIA[] = [
  {
    id: "ins_001",
    titulo: "Português 9º ano supera média estadual",
    texto:
      "A turma 7 da escola 2 superou a média estadual em 11 pontos percentuais em interpretação de texto poético. Padrão consistente nos últimos três simulados.",
    geradoEm: "2026-05-07T16:18:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["sim_009", "tur_007"],
  },
  {
    id: "ins_002",
    titulo: "Atenção em pontuação — 4 turmas afetadas",
    texto:
      "EF09LP04 (pontuação como recurso) está abaixo da meta em 4 das 5 turmas de 9º ano da rede. Sugere-se ação articulada da SEDU.",
    geradoEm: "2026-05-07T17:42:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["tur_007", "tur_012"],
  },
  {
    id: "ins_003",
    titulo: "Discalculia exige protocolo padronizado",
    texto:
      "Alunos com discalculia ficam, em média, 1,7 ponto abaixo nos simulados de matemática. Recomenda-se protocolo padronizado de adaptação.",
    geradoEm: "2026-05-08T08:48:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["sim_010"],
  },
  {
    id: "ins_004",
    titulo: "Escola 3 (Linhares Rural) com performance estável",
    texto:
      "Apesar do menor acervo de questões, a EEEF São José do Calçado Rural mantém médias próximas à urbana. Modelo de eficiência pedagógica em campo.",
    geradoEm: "2026-05-06T14:22:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["esc_003"],
  },
  {
    id: "ins_005",
    titulo: "Banco de questões aperta no 9º ano",
    texto:
      "Curadoria de matemática 9º ano precisou de 4 tentativas para distribuir nível difícil. Necessário ampliar acervo antes do próximo bimestre.",
    geradoEm: "2026-04-22T11:18:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["sim_010"],
  },
  {
    id: "ins_006",
    titulo: "Engajamento alto — turma 7 sem desistências",
    texto:
      "100% dos 25 alunos da turma 7 finalizaram os dois simulados bimestrais. Indicador de cultura de simulado consolidada.",
    geradoEm: "2026-04-22T18:42:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["tur_007"],
  },
  {
    id: "ins_007",
    titulo: "Análise combinatória — alerta em três turmas",
    texto:
      "Conteúdo EM13MAT310 apresentou taxa de erro acima de 60% em três turmas distintas. Sugere-se ciclo de reforço articulado.",
    geradoEm: "2026-05-05T10:14:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["sim_010"],
  },
  {
    id: "ins_008",
    titulo: "Tempo médio de resposta caindo — sinal positivo",
    texto:
      "Tempo médio por questão na turma 2 caiu 18% em relação ao bimestre passado. Indicativo de fluência crescente.",
    geradoEm: "2026-05-08T13:08:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["tur_002"],
  },
  {
    id: "ins_009",
    titulo: "Acessibilidade — 3 alunos com adaptação ainda sem suporte",
    texto:
      "Três alunos com dislexia cadastrada não receberam material adaptado nos últimos simulados. Acionar gestão escolar.",
    geradoEm: "2026-05-07T11:38:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["esc_001"],
  },
  {
    id: "ins_010",
    titulo: "12 alunos em risco alto — turma 7",
    texto:
      "Modelo preditivo identifica 12 alunos da turma 7 com probabilidade alta de defasagem. Plano de ação em até 10 dias.",
    geradoEm: "2026-05-08T09:22:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["tur_007"],
  },
  {
    id: "ins_011",
    titulo: "Inglês 1º médio — boa adesão a Reading",
    texto:
      "Simulado de Inglês da turma 15 mostra 80% de acerto em compreensão leitora. Conteúdo bem fixado.",
    geradoEm: "2026-05-08T14:42:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["sim_008"],
  },
  {
    id: "ins_012",
    titulo: "Geografia regional do ES — lacuna no acervo",
    texto:
      "Acervo de geografia carece de questões sobre o próprio Espírito Santo. Vácuo curricular relevante para nossa rede.",
    geradoEm: "2026-05-07T16:42:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["sim_006"],
  },
  {
    id: "ins_013",
    titulo: "Curadoria automática poupou 14 horas no mês",
    texto:
      "Em abril, a curadoria automática gerou 18 simulados com confiança média de 84%, poupando 14h de trabalho manual.",
    geradoEm: "2026-05-01T10:00:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["sim_004", "sim_005", "sim_009"],
  },
  {
    id: "ins_014",
    titulo: "Subgrupo de alta performance em matemática",
    texto:
      "Seis alunos da turma 7 estão consistentemente acima de 8,0 em matemática. Candidatos a programa de monitoria.",
    geradoEm: "2026-04-22T19:48:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["sim_010"],
  },
  {
    id: "ins_015",
    titulo: "Padrão de erro em charges — 9º ano",
    texto:
      "A questão sobre charge (que_004) gerou padrão de erro consistente. Possível dificuldade com leitura intersemiótica em toda a faixa etária.",
    geradoEm: "2026-04-15T19:55:00-03:00",
    modeloUsado: "claude-opus-4-7",
    contextoIds: ["sim_009"],
  },
];

// ============================================================================
// MENSAGENS DE RESULTADO — 10 mensagens
// ============================================================================

export const mockMensagensResultado: MensagemResultadoIA[] = [
  {
    texto:
      "Você acertou 9 das 10 questões — desempenho excelente em interpretação poética. O texto de Drummond pediu sensibilidade, e você respondeu à altura. Continue lendo poesia: foi essa leitura prévia que abriu o caminho aqui.",
    tom: "celebrativo",
    geradoEm: "2026-04-15T18:42:00-03:00",
  },
  {
    texto:
      "Nota 8,5 — você dominou o Teorema de Pitágoras e função afim com clareza. O passo seguinte é se desafiar com problemas que combinam os dois conteúdos: já está pronta para isso. Conta com a gente.",
    tom: "celebrativo",
    geradoEm: "2026-04-22T18:48:00-03:00",
  },
  {
    texto:
      "Sua nota foi 6,5 e você acertou exatamente o que precisava em equações do 1º grau. A questão de porcentagem deu trabalho, mas tem solução simples: revisite a ideia de \"parte do todo\" antes de partir para fórmula. Você está no caminho.",
    tom: "encorajador",
    geradoEm: "2026-05-08T15:18:00-03:00",
  },
  {
    texto:
      "Nota 6,0. Bom domínio em ortografia e classes de palavras — base sólida. A pegadinha foi a charge: leitura de imagem é uma habilidade que se treina. Que tal escolher uma charge de jornal por semana e tentar interpretá-la sozinho?",
    tom: "encorajador",
    geradoEm: "2026-04-15T18:55:00-03:00",
  },
  {
    texto:
      "Você ficou com 5,5. Você está perto da virada: as duas questões que errou foram por troca de alternativa no fim — leu certo, mas mudou no impulso. Próxima prova, respira antes de mudar a resposta. Confiança é parte do estudo.",
    tom: "encorajador",
    geradoEm: "2026-04-22T19:14:00-03:00",
  },
  {
    texto:
      "Nota 4,0 desta vez. Não é o resultado que esperávamos, mas vejo que você entregou todas as respostas — isso conta. O conteúdo de função afim ainda está se assentando. Vamos combinar: três sessões curtas de 20 minutos no app de reforço esta semana, e te chamamos para conversar.",
    tom: "construtivo",
    geradoEm: "2026-04-22T19:22:00-03:00",
  },
  {
    texto:
      "Você ficou com 3,5. Estes resultados não são a sua medida — eles são uma fotografia de hoje. As questões erradas foram em pontuação: aposto e vírgula. Vamos revisar isso juntos com a sua professora, e refazer só essa parte na próxima semana. Combinado?",
    tom: "construtivo",
    geradoEm: "2026-04-15T19:08:00-03:00",
  },
  {
    texto:
      "Nota 7,0 — boa! O ponto forte foi a aplicação de Pitágoras, que você explicou bem na justificativa. Para chegar mais perto do 9, foque em problemas combinados — onde você precisa identificar qual ferramenta usar antes de aplicar. Próximo ciclo é seu.",
    tom: "celebrativo",
    geradoEm: "2026-04-22T18:52:00-03:00",
  },
  {
    texto:
      "Sua nota foi 5,0 e você bateu exatamente na média estadual em interpretação poética. Não é pouco: é seu ponto de apoio. A partir daqui, o reforço em pontuação muda o jogo. Vamos te indicar três vídeos curtos para essa semana.",
    tom: "encorajador",
    geradoEm: "2026-04-15T19:01:00-03:00",
  },
  {
    texto:
      "Você acertou as 4 questões — nota 10. Aqui não tem o que ajustar; tem o que celebrar. Convido você a participar do nosso programa de monitoria entre pares: alunos como você ajudam colegas e aprofundam o próprio aprendizado. Topa?",
    tom: "celebrativo",
    geradoEm: "2026-04-22T19:05:00-03:00",
  },
];

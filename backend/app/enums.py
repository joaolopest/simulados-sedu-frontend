"""Enums fechados (valores fixos, não gerenciáveis pelo Admin).

Diferente de Série/Matéria/Conteúdo/Nível — que são tabelas porque o Admin
pode editá-las — estes são valores de domínio que só mudam via código.
"""

import enum


class PerfilUsuario(enum.Enum):
    ADMIN = "admin"            # Secretaria — gerencia o banco de questões
    GESTOR = "gestor"          # Diretor/coordenador — cria e aplica simulados
    PROFESSOR = "professor"    # Professor — cria questões e monta provas (sem apagar do banco)
    ALUNO = "aluno"            # Aluno com vínculo escolar — responde simulados
    CANDIDATO = "candidato"    # Sem vínculo escolar — supletivo, inscreve em etapas
    SUPORTE = "suporte"        # Professor/secretário — acompanha alunos


class StatusSimulado(enum.Enum):
    RASCUNHO = "rascunho"        # criado, ainda sem questões selecionadas
    GERADO = "gerado"            # questões selecionadas, aguardando liberação
    LIBERADO = "liberado"        # alunos já podem responder
    FINALIZADO = "finalizado"    # encerrado; notas calculadas
    CANCELADO = "cancelado"      # retirado do fluxo sem apagar resultados


class StatusQuestao(enum.Enum):
    """Ciclo de vida de uma questão no banco (gerenciado pelo Admin)."""

    RASCUNHO = "rascunho"        # criada, ainda não disponível
    PUBLICADA = "publicada"      # disponível para uso em simulados
    ARQUIVADA = "arquivada"      # retirada de circulação


class VinculoAluno(enum.Enum):
    """🔴 vs 🔵 do quadro: aluno de escola vs candidato do supletivo."""

    ESCOLA = "escola"            # 🔴 aluno regular, vinculado a turma
    SUPLETIVO = "supletivo"      # 🔵 candidato, vinculado a edital


class TipoEtapa(enum.Enum):
    DIAGNOSTICA = "diagnostica"
    SUPLETIVO = "supletivo"
    VESTIBULINHO = "vestibulinho"
    REPOSICAO = "reposicao"
    SIMULADO_ESTADUAL = "simulado_estadual"
    AVALIACAO_ESCOLAR = "avaliacao_escolar"


class StatusEtapa(enum.Enum):
    RASCUNHO = "rascunho"
    AGENDADA = "agendada"
    EM_ANDAMENTO = "em_andamento"
    REALIZADA = "realizada"
    CANCELADA = "cancelada"


class TipoProva(enum.Enum):
    OBJETIVA = "objetiva"
    DISCURSIVA = "discursiva"
    MISTA = "mista"
    REDACAO = "redacao"
    PRATICA = "pratica"


class StatusAgendamento(enum.Enum):
    AGENDADO = "agendado"
    CONFIRMADO = "confirmado"
    REALIZADO = "realizado"
    FALTOU = "faltou"
    CANCELADO = "cancelado"
    REAGENDADO = "reagendado"


class PrioridadeAviso(enum.Enum):
    INFORMATIVA = "informativa"
    IMPORTANTE = "importante"
    URGENTE = "urgente"


class AlvoAvisoTipo(enum.Enum):
    """O alvo do aviso: turma específica, escola toda ou rede inteira."""

    TURMA = "turma"
    ESCOLA = "escola"
    REDE = "rede"


class StatusPresenca(enum.Enum):
    PRESENTE = "presente"
    AUSENTE = "ausente"
    ATRASADO = "atrasado"
    JUSTIFICADO = "justificado"


class Parentesco(enum.Enum):
    MAE = "mae"
    PAI = "pai"
    RESPONSAVEL_LEGAL = "responsavel_legal"
    AVO = "avo"
    TIO = "tio"
    OUTRO = "outro"


class Genero(enum.Enum):
    FEMININO = "feminino"
    MASCULINO = "masculino"
    NAO_BINARIO = "nao_binario"
    OUTRO = "outro"
    PREFERE_NAO_INFORMAR = "prefere_nao_informar"


class Etnia(enum.Enum):
    BRANCA = "branca"
    PRETA = "preta"
    PARDA = "parda"
    AMARELA = "amarela"
    INDIGENA = "indigena"
    NAO_DECLARADA = "nao_declarada"


class Escolaridade(enum.Enum):
    FUND_INCOMPLETO = "fundamental_incompleto"
    FUND_COMPLETO = "fundamental_completo"
    MEDIO_INCOMPLETO = "medio_incompleto"
    MEDIO_COMPLETO = "medio_completo"
    SUPERIOR_INCOMPLETO = "superior_incompleto"
    SUPERIOR_COMPLETO = "superior_completo"


class PrioridadeAssunto(enum.Enum):
    ALTA = "alta"
    MEDIA = "media"
    BAIXA = "baixa"


class TipoRecurso(enum.Enum):
    VIDEO = "video"
    TEXTO = "texto"
    EXERCICIO = "exercicio"
    LINK = "link"
    PODCAST = "podcast"


class TipoItemCalendarioLetivo(enum.Enum):
    FERIADO = "feriado"
    RECESSO = "recesso"
    EVENTO = "evento"
    CONSELHO_DE_CLASSE = "conselho_de_classe"
    PROVA_MARCO = "prova_marco"

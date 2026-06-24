import enum


class PerfilUsuario(enum.Enum):
    ADMIN = "admin"
    GESTOR = "gestor"
    ALUNO = "aluno"
    SUPORTE = "suporte"


class StatusSimulado(enum.Enum):
    RASCUNHO = "rascunho"
    GERADO = "gerado"
    LIBERADO = "liberado"
    FINALIZADO = "finalizado"

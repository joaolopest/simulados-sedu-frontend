from __future__ import annotations

from datetime import date, datetime, time
from typing import List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.enums import (
    AlvoAvisoTipo,
    Escolaridade,
    Etnia,
    Genero,
    Parentesco,
    PerfilUsuario,
    PrioridadeAssunto,
    PrioridadeAviso,
    StatusAgendamento,
    StatusEtapa,
    StatusPresenca,
    StatusSimulado,
    TipoEtapa,
    TipoItemCalendarioLetivo,
    TipoProva,
    TipoRecurso,
    VinculoAluno,
)


# ============================================================================
# ETIQUETAS
# ============================================================================


class Serie(Base):
    """Série/ano escolar. Ex.: '6º ano', '9º ano', '3ª série EM'."""

    __tablename__ = "series"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)

    questoes: Mapped[List["Questao"]] = relationship(back_populates="serie")


class Materia(Base):
    """Disciplina. Ex.: 'Matemática', 'Português', 'Ciências'."""

    __tablename__ = "materias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)

    conteudos: Mapped[List["Conteudo"]] = relationship(
        back_populates="materia", cascade="all, delete-orphan",
    )
    questoes: Mapped[List["Questao"]] = relationship(back_populates="materia")


class Conteudo(Base):
    """Tópico dentro de uma matéria."""

    __tablename__ = "conteudos"
    __table_args__ = (
        UniqueConstraint("nome", "materia_id", name="uq_conteudo_nome_materia"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    materia_id: Mapped[int] = mapped_column(
        ForeignKey("materias.id", ondelete="CASCADE"), nullable=False,
    )

    materia: Mapped["Materia"] = relationship(back_populates="conteudos")
    questoes: Mapped[List["Questao"]] = relationship(back_populates="conteudo")


class Nivel(Base):
    """Dificuldade. Ex.: 'Fácil', 'Médio', 'Difícil'."""

    __tablename__ = "niveis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    questoes: Mapped[List["Questao"]] = relationship(back_populates="nivel")


# ============================================================================
# QUESTÕES
# ============================================================================


class Questao(Base):
    __tablename__ = "questoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    enunciado: Mapped[str] = mapped_column(Text, nullable=False)
    imagem_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    serie_id: Mapped[int] = mapped_column(ForeignKey("series.id"), nullable=False)
    materia_id: Mapped[int] = mapped_column(ForeignKey("materias.id"), nullable=False)
    conteudo_id: Mapped[int] = mapped_column(ForeignKey("conteudos.id"), nullable=False)
    nivel_id: Mapped[int] = mapped_column(ForeignKey("niveis.id"), nullable=False)

    adaptacoes: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    criada_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    serie: Mapped["Serie"] = relationship(back_populates="questoes")
    materia: Mapped["Materia"] = relationship(back_populates="questoes")
    conteudo: Mapped["Conteudo"] = relationship(back_populates="questoes")
    nivel: Mapped["Nivel"] = relationship(back_populates="questoes")

    alternativas: Mapped[List["Alternativa"]] = relationship(
        back_populates="questao",
        cascade="all, delete-orphan",
        order_by="Alternativa.ordem_original",
    )


class Alternativa(Base):
    __tablename__ = "alternativas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    questao_id: Mapped[int] = mapped_column(
        ForeignKey("questoes.id", ondelete="CASCADE"), nullable=False,
    )
    texto: Mapped[str] = mapped_column(Text, nullable=False)
    correta: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ordem_original: Mapped[int] = mapped_column(Integer, nullable=False)

    questao: Mapped["Questao"] = relationship(back_populates="alternativas")


# ============================================================================
# USUÁRIOS E ESTRUTURA ESCOLAR
# ============================================================================


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    perfil: Mapped[PerfilUsuario] = mapped_column(SAEnum(PerfilUsuario), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    aluno: Mapped[Optional["Aluno"]] = relationship(
        back_populates="usuario", uselist=False,
    )
    avisos_criados: Mapped[List["Aviso"]] = relationship(back_populates="criado_por_usuario")


class Escola(Base):
    __tablename__ = "escolas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(160), nullable=False)
    municipio: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    codigo_inep: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)

    turmas: Mapped[List["Turma"]] = relationship(
        back_populates="escola", cascade="all, delete-orphan",
    )


class Turma(Base):
    __tablename__ = "turmas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    escola_id: Mapped[int] = mapped_column(ForeignKey("escolas.id"), nullable=False)
    serie_id: Mapped[int] = mapped_column(ForeignKey("series.id"), nullable=False)
    ano_letivo: Mapped[int] = mapped_column(Integer, nullable=False)
    nome: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)

    escola: Mapped["Escola"] = relationship(back_populates="turmas")
    serie: Mapped["Serie"] = relationship()
    alunos: Mapped[List["Aluno"]] = relationship(back_populates="turma")
    simulados: Mapped[List["Simulado"]] = relationship(back_populates="turma")
    avisos: Mapped[List["Aviso"]] = relationship(back_populates="turma_alvo")
    assuntos_selecionados: Mapped[List["AssuntoPorTurma"]] = relationship(
        back_populates="turma", cascade="all, delete-orphan",
    )


class Aluno(Base):
    """Aluno (escolar 🔴) ou candidato (supletivo 🔵).

    O campo `vinculo` distingue. Aluno escola tem turma_id; candidato tem edital_id.
    Os campos cadastrais expandidos (parentesco, gênero, etc.) vivem nas tabelas
    relacionadas (Endereco, ContatoResponsavel, NecessidadeSuporte).
    """

    __tablename__ = "alunos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"), unique=True, nullable=False,
    )
    vinculo: Mapped[VinculoAluno] = mapped_column(
        SAEnum(VinculoAluno), default=VinculoAluno.ESCOLA, nullable=False,
    )

    # Aluno escola
    turma_id: Mapped[Optional[int]] = mapped_column(ForeignKey("turmas.id"), nullable=True)
    # Candidato supletivo
    edital_id: Mapped[Optional[int]] = mapped_column(ForeignKey("editais.id"), nullable=True)

    # Cadastro expandido
    nome_social: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    cpf: Mapped[Optional[str]] = mapped_column(String(14), unique=True, nullable=True)
    data_nascimento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    genero: Mapped[Optional[Genero]] = mapped_column(SAEnum(Genero), nullable=True)
    etnia: Mapped[Optional[Etnia]] = mapped_column(SAEnum(Etnia), nullable=True)
    escolaridade: Mapped[Optional[Escolaridade]] = mapped_column(
        SAEnum(Escolaridade), nullable=True,
    )

    # Endereço inline (sem normalizar — endereço pertence ao aluno e raramente é
    # compartilhado).
    endereco_logradouro: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    endereco_numero: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    endereco_complemento: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    endereco_bairro: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    endereco_municipio: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    endereco_uf: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    endereco_cep: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)

    # Adaptações cognitivas (ex.: ["tdah", "dislexia"]).
    perfil_cognitivo: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    necessita_suporte: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    avaliacao_suporte_pendente: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
    )
    observacoes_suporte: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    usuario: Mapped["Usuario"] = relationship(back_populates="aluno")
    turma: Mapped[Optional["Turma"]] = relationship(back_populates="alunos")
    edital: Mapped[Optional["Edital"]] = relationship(back_populates="candidatos")

    responsaveis: Mapped[List["ContatoResponsavel"]] = relationship(
        back_populates="aluno", cascade="all, delete-orphan",
    )
    documentos_suporte: Mapped[List["DocumentoSuporte"]] = relationship(
        back_populates="aluno", cascade="all, delete-orphan",
    )
    respostas: Mapped[List["Resposta"]] = relationship(back_populates="aluno")
    agendamentos: Mapped[List["Agendamento"]] = relationship(back_populates="aluno")
    presencas: Mapped[List["RegistroPresenca"]] = relationship(back_populates="aluno")
    guias_estudo: Mapped[List["GuiaEstudo"]] = relationship(back_populates="aluno")


class ContatoResponsavel(Base):
    """Responsável pelo aluno. Mãe é obrigatória no cadastro."""

    __tablename__ = "contatos_responsaveis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aluno_id: Mapped[int] = mapped_column(
        ForeignKey("alunos.id", ondelete="CASCADE"), nullable=False,
    )
    parentesco: Mapped[Parentesco] = mapped_column(SAEnum(Parentesco), nullable=False)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    cpf: Mapped[Optional[str]] = mapped_column(String(14), nullable=True)
    telefone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    aluno: Mapped["Aluno"] = relationship(back_populates="responsaveis")


class DocumentoSuporte(Base):
    """Documento que comprova a necessidade de suporte (laudo, atestado, etc.)."""

    __tablename__ = "documentos_suporte"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aluno_id: Mapped[int] = mapped_column(
        ForeignKey("alunos.id", ondelete="CASCADE"), nullable=False,
    )
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    nome_arquivo: Mapped[str] = mapped_column(String(160), nullable=False)
    arquivo_url: Mapped[str] = mapped_column(String(500), nullable=False)
    enviado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    aluno: Mapped["Aluno"] = relationship(back_populates="documentos_suporte")


# ============================================================================
# EDITAIS, ASSUNTOS E GUIAS DE ESTUDO
# ============================================================================


class Edital(Base):
    """Edital de supletivo / vestibulinho. Candidatos se vinculam a ele."""

    __tablename__ = "editais"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(160), nullable=False)
    ano: Mapped[int] = mapped_column(Integer, nullable=False)
    banca: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    publico_alvo: Mapped[VinculoAluno] = mapped_column(
        SAEnum(VinculoAluno), default=VinculoAluno.SUPLETIVO, nullable=False,
    )
    vigencia_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    vigencia_fim: Mapped[date] = mapped_column(Date, nullable=False)
    publicado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    candidatos: Mapped[List["Aluno"]] = relationship(back_populates="edital")
    assuntos: Mapped[List["AssuntoEstudo"]] = relationship(back_populates="edital")


class AssuntoEstudo(Base):
    """Tópico de estudo recomendado (pode vir de edital ou de série/turma)."""

    __tablename__ = "assuntos_estudo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    materia_id: Mapped[int] = mapped_column(ForeignKey("materias.id"), nullable=False)
    serie_id: Mapped[Optional[int]] = mapped_column(ForeignKey("series.id"), nullable=True)
    edital_id: Mapped[Optional[int]] = mapped_column(ForeignKey("editais.id"), nullable=True)
    publico_alvo: Mapped[VinculoAluno] = mapped_column(
        SAEnum(VinculoAluno), nullable=False,
    )
    prioridade: Mapped[PrioridadeAssunto] = mapped_column(
        SAEnum(PrioridadeAssunto), default=PrioridadeAssunto.MEDIA, nullable=False,
    )
    topicos: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    competencias: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    materia: Mapped["Materia"] = relationship()
    serie: Mapped[Optional["Serie"]] = relationship()
    edital: Mapped[Optional["Edital"]] = relationship(back_populates="assuntos")
    recursos: Mapped[List["RecursoEstudo"]] = relationship(
        back_populates="assunto", cascade="all, delete-orphan",
    )


class RecursoEstudo(Base):
    """Vídeo, texto, exercício etc. ligado a um assunto."""

    __tablename__ = "recursos_estudo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assunto_id: Mapped[int] = mapped_column(
        ForeignKey("assuntos_estudo.id", ondelete="CASCADE"), nullable=False,
    )
    tipo: Mapped[TipoRecurso] = mapped_column(SAEnum(TipoRecurso), nullable=False)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duracao_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    assunto: Mapped["AssuntoEstudo"] = relationship(back_populates="recursos")


class AssuntoPorTurma(Base):
    """Associação Turma ↔ Assunto (gestor seleciona assuntos por turma)."""

    __tablename__ = "assuntos_por_turma"
    __table_args__ = (
        UniqueConstraint("turma_id", "assunto_id", name="uq_assunto_turma"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    turma_id: Mapped[int] = mapped_column(
        ForeignKey("turmas.id", ondelete="CASCADE"), nullable=False,
    )
    assunto_id: Mapped[int] = mapped_column(
        ForeignKey("assuntos_estudo.id", ondelete="CASCADE"), nullable=False,
    )
    selecionado_por: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )

    turma: Mapped["Turma"] = relationship(back_populates="assuntos_selecionados")
    assunto: Mapped["AssuntoEstudo"] = relationship()


class GuiaEstudo(Base):
    """Guia personalizado gerado a partir de um resultado (bônus do quadro)."""

    __tablename__ = "guias_estudo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"), nullable=False)
    gerado_a_partir_simulado_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("simulados.id"), nullable=True,
    )
    assunto_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    pontos_fortes: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    pontos_fracos: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    recomendacao: Mapped[str] = mapped_column(Text, nullable=False)
    horas_estimadas: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    gerado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    aluno: Mapped["Aluno"] = relationship(back_populates="guias_estudo")


# ============================================================================
# ETAPAS, AGENDAMENTOS, FALTAS
# ============================================================================


class Etapa(Base):
    """Aplicação agendada de uma prova/simulado/diagnóstica.

    Diferente de Simulado, que é um TEMPLATE de prova, a Etapa é uma OCORRÊNCIA
    agendada (data, hora, local) — pode ser de escola 🔴 ou de supletivo 🔵.
    """

    __tablename__ = "etapas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[TipoEtapa] = mapped_column(SAEnum(TipoEtapa), nullable=False)
    tipo_prova: Mapped[TipoProva] = mapped_column(SAEnum(TipoProva), nullable=False)
    publico_alvo: Mapped[VinculoAluno] = mapped_column(SAEnum(VinculoAluno), nullable=False)

    serie_id: Mapped[Optional[int]] = mapped_column(ForeignKey("series.id"), nullable=True)
    escola_id: Mapped[Optional[int]] = mapped_column(ForeignKey("escolas.id"), nullable=True)
    edital_id: Mapped[Optional[int]] = mapped_column(ForeignKey("editais.id"), nullable=True)

    data: Mapped[date] = mapped_column(Date, nullable=False)
    hora: Mapped[time] = mapped_column(Time, nullable=False)
    duracao_min: Mapped[int] = mapped_column(Integer, nullable=False)
    local: Mapped[str] = mapped_column(String(200), nullable=False)

    oferece_suporte: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    adaptacoes_aceitas: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    materias: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    questao_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    status: Mapped[StatusEtapa] = mapped_column(
        SAEnum(StatusEtapa), default=StatusEtapa.RASCUNHO, nullable=False,
    )
    criado_por: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    agendamentos: Mapped[List["Agendamento"]] = relationship(back_populates="etapa")
    folha_presenca: Mapped[Optional["FolhaPresenca"]] = relationship(
        back_populates="etapa", uselist=False,
    )
    faltas: Mapped[List["Falta"]] = relationship(
        back_populates="etapa", foreign_keys="Falta.etapa_id",
    )


class Agendamento(Base):
    """Inscrição de um aluno/candidato em uma etapa."""

    __tablename__ = "agendamentos"
    __table_args__ = (
        UniqueConstraint("aluno_id", "etapa_id", name="uq_agendamento_aluno_etapa"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"), nullable=False)
    etapa_id: Mapped[int] = mapped_column(ForeignKey("etapas.id"), nullable=False)
    status: Mapped[StatusAgendamento] = mapped_column(
        SAEnum(StatusAgendamento), default=StatusAgendamento.AGENDADO, nullable=False,
    )
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    agendamento_anterior_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("agendamentos.id"), nullable=True,
    )
    agendado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    confirmado_em: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    realizado_em: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    aluno: Mapped["Aluno"] = relationship(back_populates="agendamentos")
    etapa: Mapped["Etapa"] = relationship(back_populates="agendamentos")


class Falta(Base):
    """Registro de falta a uma etapa. Pode dar gatilho pra reagendamento."""

    __tablename__ = "faltas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"), nullable=False)
    etapa_id: Mapped[int] = mapped_column(ForeignKey("etapas.id"), nullable=False)
    motivo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pode_reagendar: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    reagendado_para_etapa_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("etapas.id"), nullable=True,
    )
    registrada_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    aluno: Mapped["Aluno"] = relationship()
    etapa: Mapped["Etapa"] = relationship(
        back_populates="faltas", foreign_keys=[etapa_id],
    )


# ============================================================================
# PRESENÇA
# ============================================================================


class FolhaPresenca(Base):
    """Folha de chamada de uma etapa. Tem 1 folha por etapa, com N registros."""

    __tablename__ = "folhas_presenca"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    etapa_id: Mapped[int] = mapped_column(
        ForeignKey("etapas.id"), unique=True, nullable=False,
    )
    registrado_por: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    registrado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    etapa: Mapped["Etapa"] = relationship(back_populates="folha_presenca")
    registros: Mapped[List["RegistroPresenca"]] = relationship(
        back_populates="folha", cascade="all, delete-orphan",
    )


class RegistroPresenca(Base):
    __tablename__ = "registros_presenca"
    __table_args__ = (
        UniqueConstraint("folha_id", "aluno_id", name="uq_registro_folha_aluno"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    folha_id: Mapped[int] = mapped_column(
        ForeignKey("folhas_presenca.id", ondelete="CASCADE"), nullable=False,
    )
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"), nullable=False)
    status: Mapped[StatusPresenca] = mapped_column(SAEnum(StatusPresenca), nullable=False)
    hora_chegada: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    folha: Mapped["FolhaPresenca"] = relationship(back_populates="registros")
    aluno: Mapped["Aluno"] = relationship(back_populates="presencas")


# ============================================================================
# AVISOS
# ============================================================================


class Aviso(Base):
    """Aviso publicado por gestor/professor pra turma, escola ou rede."""

    __tablename__ = "avisos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    prioridade: Mapped[PrioridadeAviso] = mapped_column(
        SAEnum(PrioridadeAviso), default=PrioridadeAviso.INFORMATIVA, nullable=False,
    )
    alvo_tipo: Mapped[AlvoAvisoTipo] = mapped_column(SAEnum(AlvoAvisoTipo), nullable=False)
    turma_id: Mapped[Optional[int]] = mapped_column(ForeignKey("turmas.id"), nullable=True)
    escola_id: Mapped[Optional[int]] = mapped_column(ForeignKey("escolas.id"), nullable=True)
    criado_por: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    publicado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    expira_em: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    fixado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    criado_por_usuario: Mapped["Usuario"] = relationship(back_populates="avisos_criados")
    turma_alvo: Mapped[Optional["Turma"]] = relationship(back_populates="avisos")
    escola_alvo: Mapped[Optional["Escola"]] = relationship()


# ============================================================================
# CALENDÁRIO LETIVO
# ============================================================================


class ItemCalendarioLetivo(Base):
    """Marco do calendário letivo: feriado, recesso, conselho, prova, etc."""

    __tablename__ = "itens_calendario_letivo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    tipo: Mapped[TipoItemCalendarioLetivo] = mapped_column(
        SAEnum(TipoItemCalendarioLetivo), nullable=False,
    )
    escola_id: Mapped[Optional[int]] = mapped_column(ForeignKey("escolas.id"), nullable=True)


# ============================================================================
# SIMULADOS E RESPOSTAS
# ============================================================================


class Simulado(Base):
    __tablename__ = "simulados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    gestor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    turma_id: Mapped[int] = mapped_column(ForeignKey("turmas.id"), nullable=False)
    titulo: Mapped[str] = mapped_column(String(160), nullable=False)
    parametros_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[StatusSimulado] = mapped_column(
        SAEnum(StatusSimulado), default=StatusSimulado.RASCUNHO, nullable=False,
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    gestor: Mapped["Usuario"] = relationship()
    turma: Mapped["Turma"] = relationship(back_populates="simulados")
    questoes: Mapped[List["SimuladoQuestao"]] = relationship(
        back_populates="simulado",
        cascade="all, delete-orphan",
        order_by="SimuladoQuestao.ordem_questao",
    )
    respostas: Mapped[List["Resposta"]] = relationship(back_populates="simulado")


class SimuladoQuestao(Base):
    __tablename__ = "simulado_questoes"
    __table_args__ = (
        UniqueConstraint("simulado_id", "questao_id", name="uq_simulado_questao"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    simulado_id: Mapped[int] = mapped_column(
        ForeignKey("simulados.id", ondelete="CASCADE"), nullable=False,
    )
    questao_id: Mapped[int] = mapped_column(ForeignKey("questoes.id"), nullable=False)
    ordem_questao: Mapped[int] = mapped_column(Integer, nullable=False)
    alternativas_ordem: Mapped[list] = mapped_column(JSON, nullable=False)

    simulado: Mapped["Simulado"] = relationship(back_populates="questoes")
    questao: Mapped["Questao"] = relationship()


class Resposta(Base):
    __tablename__ = "respostas"
    __table_args__ = (
        UniqueConstraint(
            "aluno_id", "simulado_id", "questao_id", name="uq_resposta_unica",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"), nullable=False)
    simulado_id: Mapped[int] = mapped_column(ForeignKey("simulados.id"), nullable=False)
    questao_id: Mapped[int] = mapped_column(ForeignKey("questoes.id"), nullable=False)
    alternativa_id: Mapped[int] = mapped_column(
        ForeignKey("alternativas.id"), nullable=False,
    )
    correta: Mapped[bool] = mapped_column(Boolean, nullable=False)
    respondida_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    aluno: Mapped["Aluno"] = relationship(back_populates="respostas")
    simulado: Mapped["Simulado"] = relationship(back_populates="respostas")
    questao: Mapped["Questao"] = relationship()
    alternativa: Mapped["Alternativa"] = relationship()

"""Cadastro de alunos/candidatos no sistema.

    POST /cadastro/aluno     cria Usuario + Aluno (escolar OU supletivo).
                              Mãe é obrigatória nos responsáveis.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.enums import (
    Escolaridade,
    Etnia,
    Genero,
    Parentesco,
    PerfilUsuario,
    VinculoAluno,
)
from app.models import Aluno, ContatoResponsavel, Edital, Turma, Usuario
from app.services.seguranca import gerar_hash_senha

router = APIRouter(prefix="/cadastro", tags=["cadastro"])


class EnderecoIn(BaseModel):
    logradouro: str
    numero: str
    complemento: str | None = None
    bairro: str
    municipio: str
    uf: str = Field(..., min_length=2, max_length=2)
    cep: str


class ResponsavelIn(BaseModel):
    parentesco: Parentesco
    nome: str
    cpf: str | None = None
    telefone: str | None = None
    email: str | None = None


class NecessidadeSuporteIn(BaseModel):
    necessita: bool = False
    adaptacoes: list[str] = []
    documentos_enviados: bool = False
    observacoes: str | None = None


class CadastroAlunoRequest(BaseModel):
    nome: str
    email: str = Field(..., min_length=5)
    senha: str = Field(..., min_length=6)
    nome_social: str | None = None
    cpf: str
    data_nascimento: date
    genero: Genero
    etnia: Etnia
    escolaridade: Escolaridade
    endereco: EnderecoIn
    responsaveis: list[ResponsavelIn] = Field(..., min_length=1)
    necessidade_suporte: NecessidadeSuporteIn = NecessidadeSuporteIn()
    vinculo: VinculoAluno
    turma_id: int | None = None
    edital_id: int | None = None


@router.post("/aluno", status_code=201)
def cadastrar_aluno(
    req: CadastroAlunoRequest, sessao: Session = Depends(get_session),
) -> dict:
    if not any(r.parentesco is Parentesco.MAE for r in req.responsaveis):
        raise HTTPException(
            status_code=422,
            detail={
                "codigo": "MAE_OBRIGATORIA",
                "mensagem": "Pelo menos um responsável com parentesco 'mae' é obrigatório.",
            },
        )

    if req.vinculo is VinculoAluno.SUPLETIVO and not req.edital_id:
        raise HTTPException(
            status_code=422,
            detail="edital_id é obrigatório para vínculo supletivo.",
        )
    if req.vinculo is VinculoAluno.ESCOLA and not req.turma_id:
        raise HTTPException(
            status_code=422,
            detail="turma_id é obrigatório para vínculo escolar.",
        )

    if req.turma_id and not sessao.get(Turma, req.turma_id):
        raise HTTPException(status_code=400, detail="turma_id não existe.")
    if req.edital_id and not sessao.get(Edital, req.edital_id):
        raise HTTPException(status_code=400, detail="edital_id não existe.")

    email_norm = req.email.lower()
    if sessao.query(Usuario).filter(Usuario.email == email_norm).first():
        raise HTTPException(
            status_code=409,
            detail={"codigo": "EMAIL_DUPLICADO", "mensagem": "Email já cadastrado."},
        )
    if sessao.query(Aluno).filter(Aluno.cpf == req.cpf).first():
        raise HTTPException(
            status_code=409,
            detail={"codigo": "CPF_DUPLICADO", "mensagem": "CPF já cadastrado."},
        )

    perfil_usuario = (
        PerfilUsuario.CANDIDATO if req.vinculo is VinculoAluno.SUPLETIVO else PerfilUsuario.ALUNO
    )

    usuario = Usuario(
        nome=req.nome,
        email=email_norm,
        senha_hash=gerar_hash_senha(req.senha),
        perfil=perfil_usuario,
        ativo=True,
    )
    sessao.add(usuario)
    sessao.flush()

    idade = (date.today() - req.data_nascimento).days // 365
    avaliacao_pendente = (
        req.necessidade_suporte.necessita and not req.necessidade_suporte.documentos_enviados
    )

    aluno = Aluno(
        usuario_id=usuario.id,
        vinculo=req.vinculo,
        turma_id=req.turma_id,
        edital_id=req.edital_id,
        nome_social=req.nome_social,
        cpf=req.cpf,
        data_nascimento=req.data_nascimento,
        genero=req.genero,
        etnia=req.etnia,
        escolaridade=req.escolaridade,
        endereco_logradouro=req.endereco.logradouro,
        endereco_numero=req.endereco.numero,
        endereco_complemento=req.endereco.complemento,
        endereco_bairro=req.endereco.bairro,
        endereco_municipio=req.endereco.municipio,
        endereco_uf=req.endereco.uf.upper(),
        endereco_cep=req.endereco.cep,
        perfil_cognitivo=req.necessidade_suporte.adaptacoes,
        necessita_suporte=req.necessidade_suporte.necessita,
        avaliacao_suporte_pendente=avaliacao_pendente,
        observacoes_suporte=req.necessidade_suporte.observacoes,
    )
    sessao.add(aluno)
    sessao.flush()

    for r in req.responsaveis:
        sessao.add(
            ContatoResponsavel(
                aluno_id=aluno.id,
                parentesco=r.parentesco,
                nome=r.nome,
                cpf=r.cpf,
                telefone=r.telefone,
                email=r.email,
            ),
        )
    sessao.commit()
    sessao.refresh(aluno)

    return {
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "perfil": usuario.perfil.value,
        },
        "aluno": {
            "id": aluno.id,
            "vinculo": aluno.vinculo.value,
            "idade": idade,
            "turma_id": aluno.turma_id,
            "edital_id": aluno.edital_id,
            "necessita_suporte": aluno.necessita_suporte,
            "avaliacao_suporte_pendente": aluno.avaliacao_suporte_pendente,
        },
    }

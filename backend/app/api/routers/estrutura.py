"""Endpoints de ESTRUTURA ESCOLAR (admin).

Cobre o item "Visualizar alunos e turmas" 🔴 do quadro detalhado:

    GET /escolas                       lista escolas (filtros: municipio, busca)
    GET /escolas/{id}                  detalhe da escola
    GET /turmas                        lista turmas (filtros: escola_id, serie_id, ano_letivo)
    GET /turmas/{id}                   detalhe da turma + total de alunos
    GET /turmas/{id}/alunos            alunos vinculados à turma
    GET /alunos                        lista alunos (filtros: turma_id, escola_id, vinculo, busca)
    GET /alunos/{id}                   detalhe expandido (cadastro completo + responsáveis)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.enums import VinculoAluno
from app.models import Aluno, Escola, Turma

from app.api.permissoes import admin_gestor_suporte

router = APIRouter(
    prefix="/estrutura",
    tags=["estrutura"],
    dependencies=[Depends(admin_gestor_suporte)],
)


# ---------- helpers de serialização ----------


def _serializar_escola(e: Escola) -> dict:
    return {
        "id": e.id,
        "nome": e.nome,
        "municipio": e.municipio,
        "codigo_inep": e.codigo_inep,
        "total_turmas": len(e.turmas),
    }


def _serializar_turma(t: Turma) -> dict:
    return {
        "id": t.id,
        "nome": t.nome,
        "ano_letivo": t.ano_letivo,
        "escola_id": t.escola_id,
        "escola_nome": t.escola.nome if t.escola else None,
        "serie_id": t.serie_id,
        "serie_nome": t.serie.nome if t.serie else None,
        "total_alunos": len(t.alunos),
    }


def _serializar_aluno_resumo(a: Aluno) -> dict:
    return {
        "id": a.id,
        "usuario_id": a.usuario_id,
        "nome": a.usuario.nome if a.usuario else None,
        "email": a.usuario.email if a.usuario else None,
        "vinculo": a.vinculo.value,
        "turma_id": a.turma_id,
        "edital_id": a.edital_id,
        "necessita_suporte": a.necessita_suporte,
        "avaliacao_suporte_pendente": a.avaliacao_suporte_pendente,
        "adaptacoes": a.perfil_cognitivo,
    }


def _serializar_aluno_detalhado(a: Aluno) -> dict:
    base = _serializar_aluno_resumo(a)
    base.update(
        {
            "nome_social": a.nome_social,
            "cpf": a.cpf,
            "data_nascimento": a.data_nascimento.isoformat() if a.data_nascimento else None,
            "genero": a.genero.value if a.genero else None,
            "etnia": a.etnia.value if a.etnia else None,
            "escolaridade": a.escolaridade.value if a.escolaridade else None,
            "endereco": {
                "logradouro": a.endereco_logradouro,
                "numero": a.endereco_numero,
                "complemento": a.endereco_complemento,
                "bairro": a.endereco_bairro,
                "municipio": a.endereco_municipio,
                "uf": a.endereco_uf,
                "cep": a.endereco_cep,
            },
            "responsaveis": [
                {
                    "id": r.id,
                    "parentesco": r.parentesco.value,
                    "nome": r.nome,
                    "cpf": r.cpf,
                    "telefone": r.telefone,
                    "email": r.email,
                }
                for r in a.responsaveis
            ],
            "documentos_suporte": [
                {
                    "id": d.id,
                    "tipo": d.tipo,
                    "nome_arquivo": d.nome_arquivo,
                    "enviado_em": d.enviado_em.isoformat(),
                }
                for d in a.documentos_suporte
            ],
        },
    )
    return base


# ---------- ESCOLAS ----------


@router.get("/escolas")
def listar_escolas(
    municipio: str | None = Query(None),
    busca: str | None = Query(None),
    sessao: Session = Depends(get_session),
) -> dict:
    q = sessao.query(Escola)
    if municipio:
        q = q.filter(Escola.municipio.ilike(f"%{municipio}%"))
    if busca:
        q = q.filter(Escola.nome.ilike(f"%{busca}%"))
    escolas = q.order_by(Escola.nome).all()
    return {"total": len(escolas), "dados": [_serializar_escola(e) for e in escolas]}


@router.get("/escolas/{escola_id}")
def detalhar_escola(escola_id: int, sessao: Session = Depends(get_session)) -> dict:
    escola = sessao.get(Escola, escola_id)
    if not escola:
        raise HTTPException(status_code=404, detail="Escola não encontrada.")
    dados = _serializar_escola(escola)
    dados["turmas"] = [_serializar_turma(t) for t in escola.turmas]
    return dados


# ---------- TURMAS ----------


@router.get("/turmas")
def listar_turmas(
    escola_id: int | None = Query(None),
    serie_id: int | None = Query(None),
    ano_letivo: int | None = Query(None),
    sessao: Session = Depends(get_session),
) -> dict:
    q = sessao.query(Turma)
    if escola_id:
        q = q.filter(Turma.escola_id == escola_id)
    if serie_id:
        q = q.filter(Turma.serie_id == serie_id)
    if ano_letivo:
        q = q.filter(Turma.ano_letivo == ano_letivo)
    turmas = q.order_by(Turma.ano_letivo.desc(), Turma.nome).all()
    return {"total": len(turmas), "dados": [_serializar_turma(t) for t in turmas]}


@router.get("/turmas/{turma_id}")
def detalhar_turma(turma_id: int, sessao: Session = Depends(get_session)) -> dict:
    turma = sessao.get(Turma, turma_id)
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada.")
    return _serializar_turma(turma)


@router.get("/turmas/{turma_id}/alunos")
def alunos_da_turma(
    turma_id: int,
    sessao: Session = Depends(get_session),
) -> dict:
    turma = sessao.get(Turma, turma_id)
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada.")
    alunos = sessao.query(Aluno).filter(Aluno.turma_id == turma_id).all()
    return {
        "turma_id": turma_id,
        "turma_nome": turma.nome,
        "total": len(alunos),
        "alunos": [_serializar_aluno_resumo(a) for a in alunos],
    }


# ---------- ALUNOS ----------


@router.get("/alunos")
def listar_alunos(
    turma_id: int | None = Query(None),
    escola_id: int | None = Query(None),
    vinculo: VinculoAluno | None = Query(None),
    necessita_suporte: bool | None = Query(None),
    busca: str | None = Query(None, description="Busca por nome ou CPF"),
    sessao: Session = Depends(get_session),
) -> dict:
    q = sessao.query(Aluno)
    if turma_id:
        q = q.filter(Aluno.turma_id == turma_id)
    if escola_id:
        q = q.join(Turma, Aluno.turma_id == Turma.id).filter(Turma.escola_id == escola_id)
    if vinculo:
        q = q.filter(Aluno.vinculo == vinculo)
    if necessita_suporte is not None:
        q = q.filter(Aluno.necessita_suporte == necessita_suporte)
    alunos = q.all()
    if busca:
        termo = busca.lower()
        alunos = [
            a
            for a in alunos
            if (a.usuario and termo in a.usuario.nome.lower())
            or (a.cpf and termo in a.cpf.lower())
        ]
    return {"total": len(alunos), "dados": [_serializar_aluno_resumo(a) for a in alunos]}


@router.get("/alunos/{aluno_id}")
def detalhar_aluno(aluno_id: int, sessao: Session = Depends(get_session)) -> dict:
    aluno = sessao.get(Aluno, aluno_id)
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    return _serializar_aluno_detalhado(aluno)

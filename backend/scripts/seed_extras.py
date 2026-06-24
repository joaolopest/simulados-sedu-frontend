"""Popula tabelas que o seed principal não cobriu, com dados de exemplo.

Idempotente: cada seção só insere se a tabela estiver (quase) vazia, então pode
rodar de novo sem duplicar. Usa os models do app + as linhas que já existem
(usuários, alunos, turmas, escolas, simulados, questões) como referência.

Uso:  python backend/scripts/seed_extras.py
Conecta via DATABASE_URL (backend/.env). Roda fora do serverless (script local).
"""

from __future__ import annotations

import os
import random
import sys
from datetime import date, datetime, time, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal  # noqa: E402
from app.enums import (  # noqa: E402
    AlvoAvisoTipo,
    Parentesco,
    PerfilUsuario,
    PrioridadeAssunto,
    PrioridadeAviso,
    StatusAgendamento,
    StatusEtapa,
    StatusPresenca,
    TipoEtapa,
    TipoItemCalendarioLetivo,
    TipoProva,
    TipoRecurso,
    VinculoAluno,
)
from app.models import (  # noqa: E402
    Agendamento,
    AssuntoEstudo,
    AssuntoPorTurma,
    Aviso,
    ContatoResponsavel,
    DocumentoSuporte,
    Edital,
    Etapa,
    Falta,
    FolhaPresenca,
    GuiaEstudo,
    ItemCalendarioLetivo,
    Materia,
    Notificacao,
    RecursoEstudo,
    RegistroPresenca,
    RevisaoQuestao,
    Serie,
    Simulado,
    SimuladoInscricao,
    Turma,
    Usuario,
)

random.seed(42)
AGORA = datetime.now(timezone.utc)


def main() -> None:
    s = SessionLocal()

    # ---- referências existentes ------------------------------------------
    def primeiro(perfil):
        return s.query(Usuario).filter(Usuario.perfil == perfil).first()

    admin = primeiro(PerfilUsuario.ADMIN)
    gestor = primeiro(PerfilUsuario.GESTOR) or admin
    professor = primeiro(PerfilUsuario.PROFESSOR) or gestor
    suporte = primeiro(PerfilUsuario.SUPORTE) or gestor
    staff = [u for u in (admin, gestor, professor, suporte) if u]

    turmas = s.query(Turma).all()
    series = s.query(Serie).all()
    materias = s.query(Materia).all()
    simulados = s.query(Simulado).all()
    from app.models import Aluno, Questao  # locais p/ não poluir topo

    alunos = (
        s.query(Aluno)
        .filter(Aluno.turma_id.isnot(None))
        .order_by(Aluno.id)
        .limit(60)
        .all()
    )
    usuarios_aluno = [a.usuario for a in alunos if a.usuario]
    questoes = s.query(Questao).order_by(Questao.id).limit(40).all()

    resumo: list[str] = []

    def secao(nome: str, fn) -> None:
        try:
            n = fn()
            s.commit()
            resumo.append(f"[ok]  {nome}: +{n}")
        except Exception as e:  # noqa: BLE001
            s.rollback()
            resumo.append(f"[ERRO] {nome}: {str(e)[:150]}")

    # ---- NOTIFICAÇÕES -----------------------------------------------------
    def seed_notificacoes() -> int:
        if s.query(Notificacao).count() >= 6:
            return 0
        modelos = [
            ("importacao", "Importação concluída", "1.240 questões foram importadas com sucesso para o banco.", "/admin/questoes", "Ver questões"),
            ("revisao", "Nova solicitação de revisão", "Um professor solicitou revisão de uma questão de Matemática.", "/admin/questoes?status=rascunho", "Revisar"),
            ("simulado", "Simulado liberado", "O simulado 'Diagnóstica de Português' foi liberado para sua turma.", "/aluno/simulados", "Responder"),
            ("resultado", "Resultado disponível", "Seu resultado do último simulado já pode ser consultado.", "/aluno/resultados", "Ver resultado"),
            ("aviso", "Novo aviso da gestão", "Confira o aviso publicado sobre o calendário de provas.", "/avisos", "Ler aviso"),
            ("sistema", "Bem-vindo ao SEDUC Simulados", "Sua conta foi configurada. Explore o painel.", None, None),
        ]
        destinatarios = staff + usuarios_aluno[:8]
        n = 0
        for i, u in enumerate(destinatarios):
            for j in range(2):
                tipo, titulo, msg, url, label = modelos[(i + j) % len(modelos)]
                s.add(Notificacao(
                    tipo=tipo, titulo=titulo, mensagem=msg, destinatario_id=u.id,
                    lida=(j == 1), acao_url=url, acao_label=label,
                    criada_em=AGORA - timedelta(days=j, hours=i),
                    lida_em=(AGORA - timedelta(hours=i)) if j == 1 else None,
                ))
                n += 1
        return n

    # ---- AVISOS -----------------------------------------------------------
    def seed_avisos() -> int:
        if s.query(Aviso).count() > 0:
            return 0
        dados = [
            ("Calendário de simulados 2026", "As datas dos simulados estaduais já estão no calendário letivo. Confira.", PrioridadeAviso.IMPORTANTE, AlvoAvisoTipo.REDE, None, None, True),
            ("Manutenção programada", "O sistema ficará indisponível no domingo das 2h às 4h para manutenção.", PrioridadeAviso.INFORMATIVA, AlvoAvisoTipo.REDE, None, None, False),
            ("Reunião pedagógica", "Reunião com todos os professores na próxima sexta-feira às 14h.", PrioridadeAviso.IMPORTANTE, AlvoAvisoTipo.ESCOLA, None, "escola", False),
            ("Prova diagnóstica adiada", "A prova diagnóstica da turma foi adiada para a semana que vem.", PrioridadeAviso.URGENTE, AlvoAvisoTipo.TURMA, "turma", None, True),
            ("Entrega de materiais", "Os materiais de apoio já estão disponíveis na secretaria.", PrioridadeAviso.INFORMATIVA, AlvoAvisoTipo.ESCOLA, None, "escola", False),
        ]
        n = 0
        for titulo, conteudo, prio, alvo, t_flag, e_flag, fix in dados:
            turma_id = turmas[0].id if (t_flag and turmas) else None
            escola_id = (turmas[0].escola_id if turmas else None) if e_flag else None
            s.add(Aviso(
                titulo=titulo, conteudo=conteudo, prioridade=prio, alvo_tipo=alvo,
                turma_id=turma_id, escola_id=escola_id, criado_por=gestor.id,
                publicado_em=AGORA - timedelta(days=n), fixado=fix,
            ))
            n += 1
        return n

    # ---- CALENDÁRIO LETIVO ------------------------------------------------
    def seed_calendario() -> int:
        if s.query(ItemCalendarioLetivo).count() > 0:
            return 0
        itens = [
            ("Independência do Brasil", date(2026, 9, 7), TipoItemCalendarioLetivo.FERIADO),
            ("Finados", date(2026, 11, 2), TipoItemCalendarioLetivo.FERIADO),
            ("Recesso de julho", date(2026, 7, 13), TipoItemCalendarioLetivo.RECESSO),
            ("Conselho de classe - 2º bim", date(2026, 7, 3), TipoItemCalendarioLetivo.CONSELHO_DE_CLASSE),
            ("Simulado Estadual", date(2026, 8, 20), TipoItemCalendarioLetivo.PROVA_MARCO),
            ("Feira de Ciências", date(2026, 10, 15), TipoItemCalendarioLetivo.EVENTO),
        ]
        for titulo, d, tipo in itens:
            s.add(ItemCalendarioLetivo(titulo=titulo, data=d, tipo=tipo, descricao=None))
        return len(itens)

    # ---- EDITAIS ----------------------------------------------------------
    def seed_editais() -> int:
        if s.query(Edital).count() > 0:
            return 0
        s.add(Edital(nome="Supletivo EJA 2026/2", ano=2026, banca="SEDU-ES",
                     publico_alvo=VinculoAluno.SUPLETIVO,
                     vigencia_inicio=date(2026, 7, 1), vigencia_fim=date(2026, 12, 20)))
        s.add(Edital(nome="Vestibulinho Técnico 2026", ano=2026, banca="IFES",
                     publico_alvo=VinculoAluno.SUPLETIVO,
                     vigencia_inicio=date(2026, 8, 1), vigencia_fim=date(2026, 11, 30)))
        return 2

    # ---- ASSUNTOS DE ESTUDO + RECURSOS -----------------------------------
    def seed_assuntos() -> int:
        if s.query(AssuntoEstudo).count() > 0:
            return 0
        temas = [
            ("Frações e operações", ["Soma de frações", "Frações equivalentes"], PrioridadeAssunto.ALTA),
            ("Interpretação de texto", ["Ideia central", "Inferência"], PrioridadeAssunto.ALTA),
            ("Sistema solar", ["Planetas", "Movimentos da Terra"], PrioridadeAssunto.MEDIA),
            ("Revolução Industrial", ["Causas", "Consequências sociais"], PrioridadeAssunto.MEDIA),
            ("Equações do 1º grau", ["Isolamento de variável", "Problemas"], PrioridadeAssunto.ALTA),
            ("Ecossistemas", ["Cadeia alimentar", "Biomas brasileiros"], PrioridadeAssunto.BAIXA),
        ]
        serie = series[0] if series else None
        n = 0
        for i, (titulo, topicos, prio) in enumerate(temas):
            materia = materias[i % len(materias)] if materias else None
            if not materia:
                break
            a = AssuntoEstudo(
                titulo=titulo, materia_id=materia.id,
                serie_id=serie.id if serie else None, publico_alvo=VinculoAluno.ESCOLA,
                prioridade=prio, topicos=topicos, competencias=[],
            )
            s.add(a)
            s.flush()
            s.add(RecursoEstudo(assunto_id=a.id, tipo=TipoRecurso.VIDEO,
                                titulo=f"Videoaula: {titulo}", url="https://example.org/video",
                                descricao="Aula introdutória.", duracao_min=12))
            s.add(RecursoEstudo(assunto_id=a.id, tipo=TipoRecurso.EXERCICIO,
                                titulo=f"Lista de exercícios: {titulo}", url=None,
                                descricao="10 questões para praticar.", duracao_min=30))
            n += 1
        return n

    # ---- ASSUNTOS POR TURMA ----------------------------------------------
    def seed_assuntos_turma() -> int:
        if s.query(AssuntoPorTurma).count() > 0:
            return 0
        assuntos = s.query(AssuntoEstudo).limit(4).all()
        if not assuntos or not turmas:
            return 0
        n = 0
        for turma in turmas[:3]:
            for a in assuntos[:2]:
                s.add(AssuntoPorTurma(turma_id=turma.id, assunto_id=a.id,
                                      selecionado_por=gestor.id))
                n += 1
        return n

    # ---- ETAPAS (ocorrências agendadas) ----------------------------------
    def seed_etapas() -> int:
        if s.query(Etapa).count() > 0:
            return 0
        serie = series[0] if series else None
        escola_id = turmas[0].escola_id if turmas else None
        defs = [
            ("Diagnóstica de Matemática", TipoEtapa.DIAGNOSTICA, StatusEtapa.REALIZADA, date(2026, 6, 10)),
            ("Avaliação Escolar - 2º bim", TipoEtapa.AVALIACAO_ESCOLAR, StatusEtapa.AGENDADA, date(2026, 7, 8)),
            ("Simulado Estadual ES", TipoEtapa.SIMULADO_ESTADUAL, StatusEtapa.AGENDADA, date(2026, 8, 20)),
        ]
        for nome, tipo, status, d in defs:
            s.add(Etapa(
                nome=nome, tipo=tipo, tipo_prova=TipoProva.OBJETIVA,
                publico_alvo=VinculoAluno.ESCOLA, serie_id=serie.id if serie else None,
                escola_id=escola_id, data=d, hora=time(8, 0), duracao_min=120,
                local="Sala 12 - Bloco A", oferece_suporte=True,
                adaptacoes_aceitas=["tempo_adicional"], materias=["Matemática", "Português"],
                questao_ids=[], status=status, criado_por=gestor.id,
            ))
        return len(defs)

    # ---- AGENDAMENTOS -----------------------------------------------------
    def seed_agendamentos() -> int:
        if s.query(Agendamento).count() > 0:
            return 0
        etapas = s.query(Etapa).all()
        if not etapas or not alunos:
            return 0
        n = 0
        for etapa in etapas:
            for aluno in alunos[:12]:
                status = StatusAgendamento.REALIZADO if etapa.status == StatusEtapa.REALIZADA else StatusAgendamento.CONFIRMADO
                s.add(Agendamento(aluno_id=aluno.id, etapa_id=etapa.id, status=status,
                                  agendado_em=AGORA - timedelta(days=5)))
                n += 1
        return n

    # ---- PRESENÇA (folha + registros) ------------------------------------
    def seed_presenca() -> int:
        if s.query(FolhaPresenca).count() > 0:
            return 0
        etapa = s.query(Etapa).filter(Etapa.status == StatusEtapa.REALIZADA).first()
        if not etapa or not alunos:
            return 0
        folha = FolhaPresenca(etapa_id=etapa.id, registrado_por=(suporte or gestor).id)
        s.add(folha)
        s.flush()
        opcoes = [StatusPresenca.PRESENTE, StatusPresenca.PRESENTE, StatusPresenca.ATRASADO,
                  StatusPresenca.AUSENTE, StatusPresenca.JUSTIFICADO]
        n = 0
        for i, aluno in enumerate(alunos[:12]):
            st = opcoes[i % len(opcoes)]
            s.add(RegistroPresenca(
                folha_id=folha.id, aluno_id=aluno.id, status=st,
                hora_chegada=time(8, 5) if st == StatusPresenca.ATRASADO else (time(7, 55) if st == StatusPresenca.PRESENTE else None),
                observacoes="Atestado médico" if st == StatusPresenca.JUSTIFICADO else None,
            ))
            n += 1
        return n

    # ---- FALTAS -----------------------------------------------------------
    def seed_faltas() -> int:
        if s.query(Falta).count() > 0:
            return 0
        etapa = s.query(Etapa).filter(Etapa.status == StatusEtapa.REALIZADA).first()
        if not etapa or not alunos:
            return 0
        n = 0
        for aluno in alunos[12:16]:
            s.add(Falta(aluno_id=aluno.id, etapa_id=etapa.id,
                        motivo="Não compareceu sem justificativa.", pode_reagendar=True))
            n += 1
        return n

    # ---- GUIAS DE ESTUDO --------------------------------------------------
    def seed_guias() -> int:
        if s.query(GuiaEstudo).count() > 0:
            return 0
        sim = simulados[0] if simulados else None
        n = 0
        for aluno in alunos[:8]:
            s.add(GuiaEstudo(
                aluno_id=aluno.id,
                gerado_a_partir_simulado_id=sim.id if sim else None,
                assunto_ids=[], pontos_fortes=["Interpretação de texto"],
                pontos_fracos=["Frações", "Equações do 1º grau"],
                recomendacao="Revisar operações com frações e resolver a lista de equações.",
                horas_estimadas=6,
            ))
            n += 1
        return n

    # ---- INSCRIÇÕES EM SIMULADOS -----------------------------------------
    def seed_inscricoes() -> int:
        if s.query(SimuladoInscricao).count() > 0:
            return 0
        from app.models import Aluno as A
        n = 0
        for sim in simulados[:5]:
            inscritos = s.query(A).filter(A.turma_id == sim.turma_id).limit(15).all()
            for aluno in inscritos:
                s.add(SimuladoInscricao(simulado_id=sim.id, aluno_id=aluno.id,
                                        inscrito_por_id=gestor.id, status="inscrito"))
                n += 1
        return n

    # ---- REVISÕES DE QUESTÃO ---------------------------------------------
    def seed_revisoes() -> int:
        if s.query(RevisaoQuestao).count() > 0:
            return 0
        if not questoes:
            return 0
        tipos = ["edicao", "exclusao", "edicao", "exclusao"]
        motivos = [
            "Alternativa correta parece incorreta.",
            "Questão duplicada no banco.",
            "Enunciado com erro de digitação.",
            "Conteúdo fora da série indicada.",
        ]
        n = 0
        for i in range(min(4, len(questoes))):
            q = questoes[i]
            s.add(RevisaoQuestao(
                questao_id=q.id, solicitante_id=professor.id,
                escola_id=q.escola_id, tipo=tipos[i], motivo=motivos[i],
                status="pendente",
            ))
            n += 1
        return n

    # ---- CONTATOS RESPONSÁVEIS -------------------------------------------
    def seed_contatos() -> int:
        if s.query(ContatoResponsavel).count() > 0:
            return 0
        n = 0
        for aluno in alunos[:15]:
            nome_resp = (aluno.usuario.nome.split()[0] if aluno.usuario else "Responsável")
            s.add(ContatoResponsavel(
                aluno_id=aluno.id, parentesco=Parentesco.MAE,
                nome=f"Mãe de {nome_resp}", telefone="(27) 99999-0000",
                email=None,
            ))
            n += 1
        return n

    # ---- DOCUMENTOS DE SUPORTE -------------------------------------------
    def seed_documentos() -> int:
        if s.query(DocumentoSuporte).count() > 0:
            return 0
        n = 0
        for aluno in alunos[:3]:
            s.add(DocumentoSuporte(
                aluno_id=aluno.id, tipo="laudo", nome_arquivo="laudo_medico.pdf",
                arquivo_url="https://example.org/docs/laudo.pdf",
            ))
            n += 1
        return n

    secao("notificacoes", seed_notificacoes)
    secao("avisos", seed_avisos)
    secao("itens_calendario_letivo", seed_calendario)
    secao("editais", seed_editais)
    secao("assuntos_estudo + recursos", seed_assuntos)
    secao("assuntos_por_turma", seed_assuntos_turma)
    secao("etapas", seed_etapas)
    secao("agendamentos", seed_agendamentos)
    secao("folhas/registros_presenca", seed_presenca)
    secao("faltas", seed_faltas)
    secao("guias_estudo", seed_guias)
    secao("simulado_inscricoes", seed_inscricoes)
    secao("revisoes_questao", seed_revisoes)
    secao("contatos_responsaveis", seed_contatos)
    secao("documentos_suporte", seed_documentos)

    s.close()
    print("\n".join(resumo))
    print("\nSeed extras concluído.")


if __name__ == "__main__":
    main()

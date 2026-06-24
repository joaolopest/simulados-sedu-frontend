import pytest

from app.exceptions import RegraNegocio
from app.services import simulado_service


class _Alt:
    def __init__(self, correta):
        self.correta = correta


class _Questao:
    def __init__(self, id_, n_alternativas, tem_correta):
        self.id = id_
        self.alternativas = [_Alt(i == 0 and tem_correta) for i in range(n_alternativas)]


def test_guarda_rejeita_questao_sem_correta():
    with pytest.raises(RegraNegocio):
        simulado_service._validar_questao_para_simulado(_Questao(1, 4, tem_correta=False))


def test_guarda_rejeita_excesso_de_alternativas():
    with pytest.raises(RegraNegocio):
        simulado_service._validar_questao_para_simulado(_Questao(2, 6, tem_correta=True))


def test_guarda_aceita_questao_valida():
    # Não deve levantar.
    simulado_service._validar_questao_para_simulado(_Questao(3, 4, tem_correta=True))

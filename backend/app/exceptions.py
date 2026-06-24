from __future__ import annotations


class ErroDominio(Exception):
    codigo = "erro_dominio"
    status_http = 400

    def __init__(self, mensagem: str, codigo: str | None = None):
        super().__init__(mensagem)
        self.mensagem = mensagem
        if codigo is not None:
            self.codigo = codigo


class NaoEncontrado(ErroDominio):
    codigo = "nao_encontrado"
    status_http = 404


class RegraNegocio(ErroDominio):
    codigo = "regra_negocio"
    status_http = 409


class DadosInvalidos(ErroDominio):
    codigo = "dados_invalidos"
    status_http = 422


class PermissaoNegada(ErroDominio):
    codigo = "sem_permissao"
    status_http = 403

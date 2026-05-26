import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.enums import PerfilUsuario  # noqa: E402
from app.models import Usuario  # noqa: E402
from app.services import auth_service  # noqa: E402

USUARIOS = [
    ("Administrador SEDU", "admin@sedu.se.gov.br", "sedu123", PerfilUsuario.ADMIN),
    ("Gestor Demo", "gestor@sedu.se.gov.br", "sedu123", PerfilUsuario.GESTOR),
]


def main() -> None:
    with SessionLocal() as sessao:
        for nome, email, senha, perfil in USUARIOS:
            usuario = sessao.scalar(select(Usuario).where(Usuario.email == email))
            senha_hash = auth_service.gerar_hash_senha(senha)
            if usuario is None:
                sessao.add(
                    Usuario(nome=nome, email=email, senha_hash=senha_hash, perfil=perfil)
                )
            else:
                usuario.senha_hash = senha_hash
                usuario.perfil = perfil
                usuario.ativo = True
        sessao.commit()

    print("Usuarios de acesso prontos:")
    for nome, email, senha, perfil in USUARIOS:
        print(f"  {perfil.value:8} {email}  senha: {senha}")


if __name__ == "__main__":
    main()

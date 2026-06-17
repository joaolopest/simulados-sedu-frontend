"""Migracoes idempotentes para bancos ja existentes.

`Base.metadata.create_all()` cria tabelas novas, mas nao altera tabelas que ja
existem no Supabase/local. Este modulo aplica apenas ajustes seguros e
reexecutaveis.
"""

from sqlalchemy import Engine, text


def aplicar_migracoes_idempotentes(engine: Engine) -> None:
    comandos = [
        """
        DO $$
        BEGIN
            CREATE TYPE statusquestao AS ENUM ('RASCUNHO', 'PUBLICADA', 'ARQUIVADA');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END
        $$
        """,
        """
        ALTER TYPE perfilusuario ADD VALUE IF NOT EXISTS 'PROFESSOR'
        """,
        """
        ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS escola_id INTEGER REFERENCES escolas(id)
        """,
        """
        ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS foto_url VARCHAR(255)
        """,
        """
        ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMP WITH TIME ZONE
        """,
        """
        ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE
        """,
        """
        ALTER TABLE escolas
        ADD COLUMN IF NOT EXISTS uf VARCHAR(2)
        """,
        """
        ALTER TABLE escolas
        ADD COLUMN IF NOT EXISTS endereco VARCHAR(200)
        """,
        """
        ALTER TABLE escolas
        ADD COLUMN IF NOT EXISTS cep VARCHAR(10)
        """,
        """
        ALTER TABLE escolas
        ADD COLUMN IF NOT EXISTS telefone VARCHAR(20)
        """,
        """
        ALTER TABLE escolas
        ADD COLUMN IF NOT EXISTS email_contato VARCHAR(160)
        """,
        """
        ALTER TABLE escolas
        ADD COLUMN IF NOT EXISTS ativa BOOLEAN NOT NULL DEFAULT TRUE
        """,
        """
        ALTER TABLE escolas
        ADD COLUMN IF NOT EXISTS total_professores INTEGER NOT NULL DEFAULT 0
        """,
        """
        ALTER TABLE escolas
        ADD COLUMN IF NOT EXISTS criada_em TIMESTAMP WITH TIME ZONE DEFAULT now()
        """,
        """
        ALTER TABLE escolas
        ADD COLUMN IF NOT EXISTS atualizada_em TIMESTAMP WITH TIME ZONE
        """,
        """
        ALTER TABLE questoes
        ADD COLUMN IF NOT EXISTS status statusquestao
        """,
        """
        UPDATE questoes
        SET status = 'PUBLICADA'
        WHERE status IS NULL
        """,
        """
        ALTER TABLE questoes
        ALTER COLUMN status SET DEFAULT 'RASCUNHO'
        """,
        """
        ALTER TABLE questoes
        ALTER COLUMN status SET NOT NULL
        """,
        """
        ALTER TABLE questoes
        ADD COLUMN IF NOT EXISTS tempo_estimado_segundos INTEGER NOT NULL DEFAULT 60
        """,
        """
        ALTER TABLE questoes
        ADD COLUMN IF NOT EXISTS competencias JSON NOT NULL DEFAULT '[]'::json
        """,
        """
        ALTER TABLE questoes
        ADD COLUMN IF NOT EXISTS explicacao TEXT
        """,
        """
        ALTER TABLE questoes
        ADD COLUMN IF NOT EXISTS versao INTEGER NOT NULL DEFAULT 1
        """,
        """
        ALTER TABLE questoes
        ADD COLUMN IF NOT EXISTS criado_por_id INTEGER REFERENCES usuarios(id)
        """,
        """
        ALTER TABLE questoes
        ADD COLUMN IF NOT EXISTS escola_id INTEGER REFERENCES escolas(id)
        """,
        """
        ALTER TABLE questoes
        ADD COLUMN IF NOT EXISTS atualizada_em TIMESTAMP WITH TIME ZONE
        """,
        """
        UPDATE questoes q
        SET escola_id = u.escola_id
        FROM usuarios u
        WHERE q.escola_id IS NULL
          AND q.criado_por_id = u.id
          AND u.escola_id IS NOT NULL
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_questoes_escola_status
        ON questoes (escola_id, status)
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_questoes_criador_status
        ON questoes (criado_por_id, status)
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_revisoes_questao_status_escola
        ON revisoes_questao (status, escola_id)
        """,
        """
        CREATE TABLE IF NOT EXISTS simulado_inscricoes (
            id SERIAL PRIMARY KEY,
            simulado_id INTEGER NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
            aluno_id INTEGER NOT NULL REFERENCES alunos(id),
            inscrito_por_id INTEGER REFERENCES usuarios(id),
            status VARCHAR(20) NOT NULL DEFAULT 'inscrito',
            inscrito_em TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT uq_simulado_inscricao UNIQUE (simulado_id, aluno_id)
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_simulado_inscricoes_aluno
        ON simulado_inscricoes (aluno_id)
        """,
        """
        UPDATE usuarios
        SET nome = CASE email
            WHEN 'gestor@sedu.se.gov.br' THEN 'Lucia Helena Marques'
            WHEN 'professor@sedu.se.gov.br' THEN 'Antonio Carlos Brandao'
            WHEN 'suporte@sedu.se.gov.br' THEN 'Roberto Carlos Nogueira'
            WHEN 'aluno@sedu.se.gov.br' THEN 'Ana Silva Souza'
            WHEN 'candidato@sedu.se.gov.br' THEN 'Marcos Vinicius Andrade'
            ELSE nome
        END
        WHERE email IN (
            'gestor@sedu.se.gov.br',
            'professor@sedu.se.gov.br',
            'suporte@sedu.se.gov.br',
            'aluno@sedu.se.gov.br',
            'candidato@sedu.se.gov.br'
        )
          AND nome IN (
            'Gestor Demo',
            'Gestor Escolar Demo',
            'Professor Demo',
            'Suporte Demo',
            'Suporte Pedagogico Demo',
            'Aluno Demo',
            'Candidato Demo'
        )
        """,
        """
        UPDATE acoes_auditoria
        SET usuario_nome = CASE usuario_nome
            WHEN 'Gestor Demo' THEN 'Lucia Helena Marques'
            WHEN 'Gestor Escolar Demo' THEN 'Lucia Helena Marques'
            WHEN 'Professor Demo' THEN 'Antonio Carlos Brandao'
            WHEN 'Suporte Demo' THEN 'Roberto Carlos Nogueira'
            WHEN 'Suporte Pedagogico Demo' THEN 'Roberto Carlos Nogueira'
            WHEN 'Aluno Demo' THEN 'Ana Silva Souza'
            WHEN 'Candidato Demo' THEN 'Marcos Vinicius Andrade'
            ELSE usuario_nome
        END
        WHERE usuario_nome IN (
            'Gestor Demo',
            'Gestor Escolar Demo',
            'Professor Demo',
            'Suporte Demo',
            'Suporte Pedagogico Demo',
            'Aluno Demo',
            'Candidato Demo'
        )
        """,
        """
        UPDATE acoes_auditoria
        SET detalhes = replace(
            replace(
            replace(
            replace(
            replace(
            replace(
            replace(detalhes,
                'Gestor Escolar Demo', 'Lucia Helena Marques'),
                'Gestor Demo', 'Lucia Helena Marques'),
                'Professor Demo', 'Antonio Carlos Brandao'),
                'Suporte Demo', 'Roberto Carlos Nogueira'),
                'Suporte Pedagogico Demo', 'Roberto Carlos Nogueira'),
                'Aluno Demo', 'Ana Silva Souza'),
                'Candidato Demo', 'Marcos Vinicius Andrade')
        WHERE detalhes IS NOT NULL
          AND (
            detalhes LIKE '%Gestor Demo%'
            OR detalhes LIKE '%Gestor Escolar Demo%'
            OR detalhes LIKE '%Professor Demo%'
            OR detalhes LIKE '%Suporte Demo%'
            OR detalhes LIKE '%Suporte Pedagogico Demo%'
            OR detalhes LIKE '%Aluno Demo%'
            OR detalhes LIKE '%Candidato Demo%'
          )
        """,
        """
        UPDATE simulados
        SET titulo = 'Diagnostica 9A'
        WHERE titulo = 'Diagnostica Demo - 9A'
        """,
        """
        DO $$
        DECLARE
            item RECORD;
            v_origem_id INTEGER;
            v_materia_id INTEGER;
            v_destino_id INTEGER;
        BEGIN
            FOR item IN
                SELECT * FROM (VALUES
                    ('Equacoes do primeiro grau', 'Equações do 1º grau'),
                    ('Interpretacao de texto', 'Interpretação de texto'),
                    ('Fotossintese', 'Fotossíntese'),
                    ('Revolucao Industrial', 'Revolução Industrial'),
                    ('Movimento retilineo uniforme', 'Movimento retilíneo uniforme')
                ) AS v(origem, destino)
            LOOP
                FOR v_origem_id, v_materia_id IN
                    SELECT id, materia_id FROM conteudos WHERE nome = item.origem
                LOOP
                    SELECT id INTO v_destino_id
                    FROM conteudos
                    WHERE nome = item.destino
                      AND materia_id = v_materia_id
                      AND id <> v_origem_id
                    LIMIT 1;

                    IF v_destino_id IS NOT NULL THEN
                        UPDATE questoes
                        SET conteudo_id = v_destino_id
                        WHERE conteudo_id = v_origem_id;

                        DELETE FROM conteudos WHERE id = v_origem_id;
                    ELSE
                        UPDATE conteudos
                        SET nome = item.destino
                        WHERE id = v_origem_id;
                    END IF;
                END LOOP;
            END LOOP;
        END
        $$
        """,
    ]
    with engine.begin() as conexao:
        for comando in comandos:
            conexao.execute(text(comando))

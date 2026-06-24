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
        ALTER TYPE statusquestao ADD VALUE IF NOT EXISTS 'EM_REVISAO'
        """,
        """
        ALTER TYPE perfilusuario ADD VALUE IF NOT EXISTS 'PROFESSOR'
        """,
        """
        ALTER TYPE statussimulado ADD VALUE IF NOT EXISTS 'CANCELADO'
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
        CREATE TABLE IF NOT EXISTS configuracoes_sistema (
            id SERIAL PRIMARY KEY,
            chave VARCHAR(80) UNIQUE NOT NULL,
            valor_json JSON NOT NULL DEFAULT '{}'::json,
            descricao TEXT,
            atualizado_por_id INTEGER REFERENCES usuarios(id),
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            atualizado_em TIMESTAMP WITH TIME ZONE
        )
        """,
        """
        INSERT INTO configuracoes_sistema (chave, valor_json, descricao)
        VALUES
            (
                'provas',
                '{
                    "tempoPadraoMinutos": 60,
                    "quantidadeMinimaQuestoes": 3,
                    "quantidadeMaximaQuestoes": 100,
                    "politicaReabertura": "justificativa_obrigatoria",
                    "permitirReabrirAposFinalizacao": true,
                    "motivoReaberturaMinCaracteres": 5
                }'::json,
                'Regras globais de criação, validação, liberação e reabertura de provas.'
            ),
            (
                'acessibilidade',
                '{
                    "tempoExtraPercentualPadrao": 25,
                    "permitirFonteMaior": true,
                    "permitirAltoContraste": true,
                    "permitirLeituraSimplificada": true,
                    "adaptacoesDisponiveis": ["tdah", "dislexia", "deficiencia_visual", "autismo"]
                }'::json,
                'Parâmetros globais de acessibilidade e adaptações pedagógicas.'
            ),
            (
                'resultados',
                '{
                    "mostrarGabaritoAoAluno": true,
                    "mostrarResultadoImediato": true,
                    "notaMinimaRecomendada": 7
                }'::json,
                'Regras globais de visualização e interpretação dos resultados.'
            )
        ON CONFLICT (chave) DO NOTHING
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
        ALTER TABLE revisoes_questao
        ADD COLUMN IF NOT EXISTS proposta_json JSON
        """,
        """
        CREATE TABLE IF NOT EXISTS questao_versoes (
            id SERIAL PRIMARY KEY,
            questao_id INTEGER NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
            versao INTEGER NOT NULL,
            snapshot_json JSON NOT NULL DEFAULT '{}'::json,
            criado_por_id INTEGER REFERENCES usuarios(id),
            motivo TEXT,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT uq_questao_versao UNIQUE (questao_id, versao)
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_questao_versoes_questao
        ON questao_versoes (questao_id)
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
        CREATE TABLE IF NOT EXISTS simulado_snapshots (
            id SERIAL PRIMARY KEY,
            simulado_id INTEGER NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
            versao INTEGER NOT NULL DEFAULT 1,
            titulo VARCHAR(160) NOT NULL,
            parametros_json JSON NOT NULL DEFAULT '{}'::json,
            questoes_json JSON NOT NULL DEFAULT '[]'::json,
            total_questoes INTEGER NOT NULL DEFAULT 0,
            criado_por_id INTEGER REFERENCES usuarios(id),
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT uq_simulado_snapshot_versao UNIQUE (simulado_id, versao)
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_simulado_snapshots_simulado
        ON simulado_snapshots (simulado_id)
        """,
        """
        CREATE TABLE IF NOT EXISTS simulado_tentativas (
            id SERIAL PRIMARY KEY,
            simulado_id INTEGER NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
            aluno_id INTEGER NOT NULL REFERENCES alunos(id),
            snapshot_id INTEGER REFERENCES simulado_snapshots(id),
            numero INTEGER NOT NULL DEFAULT 1,
            status VARCHAR(24) NOT NULL DEFAULT 'nao_iniciado',
            iniciado_em TIMESTAMP WITH TIME ZONE,
            ultima_atividade_em TIMESTAMP WITH TIME ZONE,
            finalizado_em TIMESTAMP WITH TIME ZONE,
            reaberto_em TIMESTAMP WITH TIME ZONE,
            reaberto_por_id INTEGER REFERENCES usuarios(id),
            motivo_reabertura TEXT,
            tempo_total_segundos INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT uq_simulado_tentativa_numero UNIQUE (simulado_id, aluno_id, numero)
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_simulado_tentativas_aluno_status
        ON simulado_tentativas (aluno_id, status)
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_simulado_tentativas_simulado_status
        ON simulado_tentativas (simulado_id, status)
        """,
        """
        ALTER TABLE respostas
        ADD COLUMN IF NOT EXISTS tempo_gasto_segundos INTEGER NOT NULL DEFAULT 0
        """,
        """
        ALTER TABLE respostas
        ADD COLUMN IF NOT EXISTS tentativa_id INTEGER REFERENCES simulado_tentativas(id)
        """,
        """
        ALTER TABLE respostas
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'respondida'
        """,
        """
        ALTER TABLE respostas
        ADD COLUMN IF NOT EXISTS trocas_de_resposta INTEGER NOT NULL DEFAULT 0
        """,
        """
        ALTER TABLE respostas
        ALTER COLUMN alternativa_id DROP NOT NULL
        """,
        """
        ALTER TABLE respostas
        DROP CONSTRAINT IF EXISTS uq_resposta_unica
        """,
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_resposta_tentativa_questao
        ON respostas (tentativa_id, questao_id)
        WHERE tentativa_id IS NOT NULL
        """,
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_resposta_legacy_unica
        ON respostas (aluno_id, simulado_id, questao_id)
        WHERE tentativa_id IS NULL
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_respostas_aluno_simulado
        ON respostas (aluno_id, simulado_id)
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_acoes_auditoria_ocorrido
        ON acoes_auditoria (ocorrido_em)
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_acoes_auditoria_tipo_ocorrido
        ON acoes_auditoria (tipo, ocorrido_em)
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_acoes_auditoria_usuario_ocorrido
        ON acoes_auditoria (usuario_id, ocorrido_em)
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_acoes_auditoria_alvo
        ON acoes_auditoria (alvo_tipo, alvo_id)
        """,
        """
        CREATE TABLE IF NOT EXISTS resultados_simulado (
            id SERIAL PRIMARY KEY,
            simulado_id INTEGER NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
            aluno_id INTEGER NOT NULL REFERENCES alunos(id),
            tentativa_id INTEGER NOT NULL REFERENCES simulado_tentativas(id) ON DELETE CASCADE,
            snapshot_id INTEGER REFERENCES simulado_snapshots(id),
            nota_final FLOAT NOT NULL DEFAULT 0,
            preenchidas INTEGER NOT NULL DEFAULT 0,
            acertos INTEGER NOT NULL DEFAULT 0,
            erros INTEGER NOT NULL DEFAULT 0,
            em_branco INTEGER NOT NULL DEFAULT 0,
            tempo_total_segundos INTEGER NOT NULL DEFAULT 0,
            resultado_json JSON NOT NULL DEFAULT '{}'::json,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT uq_resultado_tentativa UNIQUE (tentativa_id)
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_resultados_simulado_aluno
        ON resultados_simulado (aluno_id)
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_resultados_simulado_simulado
        ON resultados_simulado (simulado_id)
        """,
        """
        WITH grupos AS (
            SELECT
                r.simulado_id,
                r.aluno_id,
                MIN(r.respondida_em) AS iniciado_em,
                MAX(r.respondida_em) AS finalizado_em,
                COALESCE(SUM(r.tempo_gasto_segundos), 0)::integer AS tempo_total
            FROM respostas r
            WHERE r.tentativa_id IS NULL
            GROUP BY r.simulado_id, r.aluno_id
        ),
        snapshots AS (
            SELECT DISTINCT ON (simulado_id)
                simulado_id,
                id AS snapshot_id
            FROM simulado_snapshots
            ORDER BY simulado_id, versao DESC, id DESC
        )
        INSERT INTO simulado_tentativas (
            simulado_id,
            aluno_id,
            snapshot_id,
            numero,
            status,
            iniciado_em,
            ultima_atividade_em,
            finalizado_em,
            tempo_total_segundos
        )
        SELECT
            g.simulado_id,
            g.aluno_id,
            s.snapshot_id,
            1,
            'finalizada',
            g.iniciado_em,
            COALESCE(g.finalizado_em, g.iniciado_em, now()),
            COALESCE(g.finalizado_em, g.iniciado_em, now()),
            g.tempo_total
        FROM grupos g
        LEFT JOIN snapshots s ON s.simulado_id = g.simulado_id
        WHERE NOT EXISTS (
            SELECT 1
            FROM simulado_tentativas t
            WHERE t.simulado_id = g.simulado_id
              AND t.aluno_id = g.aluno_id
        )
        ON CONFLICT DO NOTHING
        """,
        """
        UPDATE respostas r
        SET tentativa_id = t.id
        FROM simulado_tentativas t
        WHERE r.tentativa_id IS NULL
          AND t.simulado_id = r.simulado_id
          AND t.aluno_id = r.aluno_id
          AND t.numero = 1
        """,
        """
        INSERT INTO simulado_inscricoes (
            simulado_id,
            aluno_id,
            status,
            inscrito_em
        )
        SELECT
            t.simulado_id,
            t.aluno_id,
            'finalizado',
            COALESCE(t.iniciado_em, t.finalizado_em, now())
        FROM simulado_tentativas t
        WHERE t.status = 'finalizada'
          AND EXISTS (
            SELECT 1 FROM respostas r WHERE r.tentativa_id = t.id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM simulado_inscricoes si
            WHERE si.simulado_id = t.simulado_id
              AND si.aluno_id = t.aluno_id
          )
        ON CONFLICT DO NOTHING
        """,
        """
        WITH stats AS (
            SELECT
                t.id AS tentativa_id,
                t.simulado_id,
                t.aluno_id,
                t.snapshot_id,
                COALESCE(total.total_questoes, COUNT(DISTINCT r.questao_id), 0) AS total_questoes,
                COUNT(*) FILTER (
                    WHERE r.alternativa_id IS NOT NULL
                      AND COALESCE(r.status, 'respondida') = 'respondida'
                ) AS preenchidas,
                COUNT(*) FILTER (WHERE COALESCE(a.correta, false) IS TRUE) AS acertos,
                COUNT(*) FILTER (
                    WHERE r.alternativa_id IS NOT NULL
                      AND COALESCE(a.correta, false) IS FALSE
                ) AS erros,
                CASE
                    WHEN COALESCE(SUM(r.tempo_gasto_segundos), 0) > 0
                        THEN COALESCE(SUM(r.tempo_gasto_segundos), 0)::integer
                    ELSE GREATEST(
                        0,
                        COALESCE(EXTRACT(EPOCH FROM (MAX(r.respondida_em) - MIN(r.respondida_em)))::integer, 0)
                    )
                END AS tempo_total_segundos
            FROM simulado_tentativas t
            JOIN respostas r ON r.tentativa_id = t.id
            LEFT JOIN alternativas a ON a.id = r.alternativa_id
            LEFT JOIN (
                SELECT simulado_id, COUNT(*) AS total_questoes
                FROM simulado_questoes
                GROUP BY simulado_id
            ) total ON total.simulado_id = t.simulado_id
            WHERE NOT EXISTS (
                SELECT 1 FROM resultados_simulado rs WHERE rs.tentativa_id = t.id
            )
            GROUP BY
                t.id,
                t.simulado_id,
                t.aluno_id,
                t.snapshot_id,
                total.total_questoes
        )
        INSERT INTO resultados_simulado (
            simulado_id,
            aluno_id,
            tentativa_id,
            snapshot_id,
            nota_final,
            preenchidas,
            acertos,
            erros,
            em_branco,
            tempo_total_segundos,
            resultado_json
        )
        SELECT
            s.simulado_id,
            s.aluno_id,
            s.tentativa_id,
            s.snapshot_id,
            CASE
                WHEN s.total_questoes > 0
                    THEN ROUND((s.acertos::numeric / s.total_questoes::numeric) * 10, 1)::float
                ELSE 0
            END AS nota_final,
            s.preenchidas,
            s.acertos,
            s.erros,
            GREATEST(0, s.total_questoes - s.preenchidas) AS em_branco,
            s.tempo_total_segundos,
            json_build_object(
                'id', 'res_' || s.aluno_id || '_' || s.simulado_id || '_' || s.tentativa_id,
                'simuladoId', s.simulado_id::text,
                'alunoId', s.aluno_id::text,
                'tentativaId', s.tentativa_id::text,
                'notaFinal', CASE
                    WHEN s.total_questoes > 0
                        THEN ROUND((s.acertos::numeric / s.total_questoes::numeric) * 10, 1)::float
                    ELSE 0
                END,
                'totalQuestoes', s.total_questoes,
                'preenchidas', s.preenchidas,
                'acertos', s.acertos,
                'erros', s.erros,
                'emBranco', GREATEST(0, s.total_questoes - s.preenchidas),
                'tempoTotalSegundos', s.tempo_total_segundos,
                'respostas', COALESCE((
                    SELECT json_agg(
                        json_build_object(
                            'questaoId', r.questao_id::text,
                            'alternativaId', CASE
                                WHEN r.alternativa_id IS NULL THEN NULL
                                ELSE r.alternativa_id::text
                            END,
                            'status', COALESCE(r.status, 'respondida'),
                            'tempoGastoSegundos', COALESCE(r.tempo_gasto_segundos, 0),
                            'trocasDeResposta', COALESCE(r.trocas_de_resposta, 0),
                            'respondidaEm', r.respondida_em
                        )
                        ORDER BY r.questao_id
                    )
                    FROM respostas r
                    WHERE r.tentativa_id = s.tentativa_id
                ), '[]'::json)
            )
        FROM stats s
        ON CONFLICT (tentativa_id) DO NOTHING
        """,
        """
        CREATE TABLE IF NOT EXISTS prova_templates (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(160) NOT NULL,
            descricao TEXT,
            escola_id INTEGER REFERENCES escolas(id),
            criado_por_id INTEGER NOT NULL REFERENCES usuarios(id),
            parametros_json JSON NOT NULL DEFAULT '{}'::json,
            ativo BOOLEAN NOT NULL DEFAULT TRUE,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            atualizado_em TIMESTAMP WITH TIME ZONE
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_prova_templates_escola_ativo
        ON prova_templates (escola_id, ativo)
        """,
        """
        UPDATE usuarios
        SET nome = CASE email
            WHEN 'admin@sedu.se.gov.br' THEN 'Renata Albuquerque Cardoso'
            WHEN 'gestor@sedu.se.gov.br' THEN 'Lucia Helena Marques'
            WHEN 'professor@sedu.se.gov.br' THEN 'Antonio Carlos Brandao'
            WHEN 'suporte@sedu.se.gov.br' THEN 'Roberto Carlos Nogueira'
            WHEN 'aluno@sedu.se.gov.br' THEN 'Ana Silva Souza'
            WHEN 'candidato@sedu.se.gov.br' THEN 'Marcos Vinicius Andrade'
            ELSE nome
        END
        WHERE email IN (
            'admin@sedu.se.gov.br',
            'gestor@sedu.se.gov.br',
            'professor@sedu.se.gov.br',
            'suporte@sedu.se.gov.br',
            'aluno@sedu.se.gov.br',
            'candidato@sedu.se.gov.br'
        )
          AND nome IN (
            'Administrador SEDU',
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
            WHEN 'Administrador SEDU' THEN 'Renata Albuquerque Cardoso'
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
            'Administrador SEDU',
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
            replace(
            replace(detalhes,
                'Administrador SEDU', 'Renata Albuquerque Cardoso'),
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
            OR detalhes LIKE '%Administrador SEDU%'
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
        UPDATE simulados
        SET parametros_json = jsonb_set(
            parametros_json::jsonb,
            '{nome}',
            '"Diagnostica 9A"'::jsonb
        )::json
        WHERE parametros_json->>'nome' = 'Diagnostica Demo - 9A'
        """,
        """
        UPDATE escolas
        SET codigo_inep = CASE codigo_inep
            WHEN 'SEDU-DEMO-001' THEN '32001001'
            WHEN 'SEDU-DEMO-002' THEN '32001002'
            ELSE codigo_inep
        END
        WHERE codigo_inep IN ('SEDU-DEMO-001', 'SEDU-DEMO-002')
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

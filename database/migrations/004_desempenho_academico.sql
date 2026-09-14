-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 004 - DESEMPENHO ACADÊMICO
-- ============================================================
--
-- Dependências:
--   002_pessoas.sql
--   003_academico.sql
--
-- Cria:
--
--   atividades
--   entregas_atividades
--   avaliacoes
--   notas
--   aulas
--   frequencias
--
-- PRINCÍPIOS:
--
--   - notas pertencem à matrícula do aluno;
--   - frequência pertence à matrícula do aluno;
--   - médias NÃO são armazenadas;
--   - percentual de frequência NÃO é armazenado;
--   - esses valores serão calculados posteriormente;
--   - atividades e avaliações pertencem à oferta real
--     turma + disciplina + professor;
--   - todo o histórico acadêmico deve ser preservado.
--
-- Executar esta migration UMA VEZ.
-- ============================================================


USE primeway_school;


-- ============================================================
-- 1. ATIVIDADES
-- ============================================================
--
-- Representa atividades propostas para uma turma/disciplina.
--
-- Exemplos:
--
--   Lista de exercícios
--   Trabalho de pesquisa
--   Projeto
--   Atividade em sala
--   Tarefa para casa
--
-- Uma atividade pode existir sem necessariamente gerar nota.
-- Caso seja avaliativa, ela poderá ser ligada posteriormente
-- a um registro em avaliacoes.
-- ============================================================

CREATE TABLE atividades (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    turma_disciplina_id BIGINT UNSIGNED NOT NULL,

    periodo_letivo_id BIGINT UNSIGNED NOT NULL,

    titulo VARCHAR(190) NOT NULL,

    descricao TEXT NULL,

    data_publicacao DATETIME NULL,

    data_entrega DATETIME NULL,

    status ENUM(
        'Rascunho',
        'Publicada',
        'Encerrada',
        'Cancelada'
    ) NOT NULL DEFAULT 'Rascunho',

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_atividades_turma_disciplina (
        turma_disciplina_id
    ),

    KEY idx_atividades_periodo (
        periodo_letivo_id
    ),

    KEY idx_atividades_status (
        status
    ),

    KEY idx_atividades_entrega (
        data_entrega
    ),

    CONSTRAINT fk_atividades_turma_disciplina
        FOREIGN KEY (
            turma_disciplina_id
        )
        REFERENCES turma_disciplinas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_atividades_periodo
        FOREIGN KEY (
            periodo_letivo_id
        )
        REFERENCES periodos_letivos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_atividades_datas
        CHECK (
            data_entrega IS NULL
            OR data_publicacao IS NULL
            OR data_entrega >= data_publicacao
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. ENTREGAS DE ATIVIDADES
-- ============================================================
--
-- Registra a entrega de uma atividade por um aluno.
--
-- Utilizamos matricula_id em vez de aluno_id porque a entrega
-- pertence ao contexto acadêmico daquele aluno naquela turma.
--
-- Uma entrega NÃO armazena nota.
--
-- Caso a atividade seja avaliativa, a nota será registrada
-- em avaliacoes + notas.
-- ============================================================

CREATE TABLE entregas_atividades (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    atividade_id BIGINT UNSIGNED NOT NULL,

    matricula_id BIGINT UNSIGNED NOT NULL,

    conteudo TEXT NULL,

    status ENUM(
        'Pendente',
        'Entregue',
        'Atrasada',
        'Corrigida',
        'Cancelada'
    ) NOT NULL DEFAULT 'Pendente',

    entregue_em DATETIME NULL,

    corrigida_em DATETIME NULL,

    feedback TEXT NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_entregas_atividade_matricula (
        atividade_id,
        matricula_id
    ),

    KEY idx_entregas_matricula (
        matricula_id
    ),

    KEY idx_entregas_status (
        status
    ),

    KEY idx_entregas_data (
        entregue_em
    ),

    CONSTRAINT fk_entregas_atividade
        FOREIGN KEY (
            atividade_id
        )
        REFERENCES atividades (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_entregas_matricula
        FOREIGN KEY (
            matricula_id
        )
        REFERENCES matriculas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. AVALIAÇÕES
-- ============================================================
--
-- Representa qualquer instrumento que gere nota.
--
-- Exemplos:
--
--   Prova
--   Trabalho
--   Atividade
--   Projeto
--   Recuperação
--
-- atividade_id é opcional.
--
-- Assim uma prova pode existir diretamente como avaliação,
-- enquanto uma atividade avaliativa pode ligar os dois
-- registros.
--
-- peso permite futuramente médias ponderadas.
-- ============================================================

CREATE TABLE avaliacoes (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    turma_disciplina_id BIGINT UNSIGNED NOT NULL,

    periodo_letivo_id BIGINT UNSIGNED NOT NULL,

    atividade_id BIGINT UNSIGNED NULL,

    titulo VARCHAR(190) NOT NULL,

    descricao TEXT NULL,

    tipo ENUM(
        'Prova',
        'Trabalho',
        'Atividade',
        'Projeto',
        'Recuperação',
        'Outro'
    ) NOT NULL,

    valor_maximo DECIMAL(6,2) NOT NULL,

    peso DECIMAL(6,2) NOT NULL DEFAULT 1.00,

    data_avaliacao DATE NULL,

    status ENUM(
        'Planejada',
        'Aplicada',
        'Finalizada',
        'Cancelada'
    ) NOT NULL DEFAULT 'Planejada',

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_avaliacoes_turma_disciplina (
        turma_disciplina_id
    ),

    KEY idx_avaliacoes_periodo (
        periodo_letivo_id
    ),

    KEY idx_avaliacoes_atividade (
        atividade_id
    ),

    KEY idx_avaliacoes_data (
        data_avaliacao
    ),

    KEY idx_avaliacoes_status (
        status
    ),

    CONSTRAINT fk_avaliacoes_turma_disciplina
        FOREIGN KEY (
            turma_disciplina_id
        )
        REFERENCES turma_disciplinas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_avaliacoes_periodo
        FOREIGN KEY (
            periodo_letivo_id
        )
        REFERENCES periodos_letivos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_avaliacoes_atividade
        FOREIGN KEY (
            atividade_id
        )
        REFERENCES atividades (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_avaliacoes_valor
        CHECK (
            valor_maximo > 0
        ),

    CONSTRAINT chk_avaliacoes_peso
        CHECK (
            peso > 0
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. NOTAS
-- ============================================================
--
-- A nota pertence:
--
--   avaliação
--      +
--   matrícula
--
-- e NÃO diretamente ao cadastro do aluno.
--
-- Portanto o histórico continua correto mesmo se o aluno
-- trocar de turma posteriormente.
--
-- A média final não é armazenada aqui.
-- Ela será calculada a partir das avaliações/notas.
-- ============================================================

CREATE TABLE notas (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    avaliacao_id BIGINT UNSIGNED NOT NULL,

    matricula_id BIGINT UNSIGNED NOT NULL,

    valor DECIMAL(6,2) NOT NULL,

    observacao TEXT NULL,

    lancada_em DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_notas_avaliacao_matricula (
        avaliacao_id,
        matricula_id
    ),

    KEY idx_notas_matricula (
        matricula_id
    ),

    KEY idx_notas_avaliacao (
        avaliacao_id
    ),

    CONSTRAINT fk_notas_avaliacao
        FOREIGN KEY (
            avaliacao_id
        )
        REFERENCES avaliacoes (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_notas_matricula
        FOREIGN KEY (
            matricula_id
        )
        REFERENCES matriculas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_notas_valor
        CHECK (
            valor >= 0
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. AULAS
-- ============================================================
--
-- Cada aula pertence a uma turma_disciplina.
--
-- periodo_letivo_id facilita relatórios e fechamento
-- acadêmico por bimestre/trimestre/semestre.
--
-- O conteúdo ministrado é armazenado para formar o diário
-- de classe do professor.
-- ============================================================

CREATE TABLE aulas (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    turma_disciplina_id BIGINT UNSIGNED NOT NULL,

    periodo_letivo_id BIGINT UNSIGNED NOT NULL,

    data_aula DATE NOT NULL,

    horario_inicio TIME NULL,

    horario_fim TIME NULL,

    conteudo TEXT NULL,

    observacoes TEXT NULL,

    status ENUM(
        'Planejada',
        'Realizada',
        'Cancelada'
    ) NOT NULL DEFAULT 'Planejada',

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_aulas_turma_disciplina (
        turma_disciplina_id
    ),

    KEY idx_aulas_periodo (
        periodo_letivo_id
    ),

    KEY idx_aulas_data (
        data_aula
    ),

    KEY idx_aulas_status (
        status
    ),

    CONSTRAINT fk_aulas_turma_disciplina
        FOREIGN KEY (
            turma_disciplina_id
        )
        REFERENCES turma_disciplinas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_aulas_periodo
        FOREIGN KEY (
            periodo_letivo_id
        )
        REFERENCES periodos_letivos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_aulas_horario
        CHECK (
            horario_inicio IS NULL
            OR horario_fim IS NULL
            OR horario_fim > horario_inicio
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 6. FREQUÊNCIAS
-- ============================================================
--
-- Cada frequência liga:
--
--   aula
--     +
--   matrícula
--
-- O percentual de frequência NÃO fica armazenado.
--
-- Futuramente será calculado usando os registros desta tabela.
-- ============================================================

CREATE TABLE frequencias (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    aula_id BIGINT UNSIGNED NOT NULL,

    matricula_id BIGINT UNSIGNED NOT NULL,

    situacao ENUM(
        'Presente',
        'Falta',
        'Justificada',
        'Atraso'
    ) NOT NULL DEFAULT 'Presente',

    observacao VARCHAR(500) NULL,

    registrado_em DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_frequencias_aula_matricula (
        aula_id,
        matricula_id
    ),

    KEY idx_frequencias_matricula (
        matricula_id
    ),

    KEY idx_frequencias_situacao (
        situacao
    ),

    CONSTRAINT fk_frequencias_aula
        FOREIGN KEY (
            aula_id
        )
        REFERENCES aulas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_frequencias_matricula
        FOREIGN KEY (
            matricula_id
        )
        REFERENCES matriculas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- FIM DA MIGRATION 004
-- ============================================================
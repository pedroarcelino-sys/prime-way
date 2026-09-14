-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 003 - ESTRUTURA ACADÊMICA
-- ============================================================
--
-- Dependência:
--   002_pessoas.sql
--
-- Cria:
--
--   anos_letivos
--   periodos_letivos
--   turmas
--   disciplinas
--   matriculas
--   turma_disciplinas
--
-- IMPORTANTE:
--
--   - alunos vem da migration 002;
--   - professores vem da migration 002;
--   - todos os vínculos utilizam IDs;
--   - quantidade de alunos NÃO é armazenada em turmas;
--   - média e frequência NÃO são armazenadas em alunos;
--   - carga horária da disciplina dentro de uma turma
--     pertence a turma_disciplinas;
--   - registros acadêmicos devem ser preferencialmente
--     inativados, e não fisicamente apagados.
--
-- Executar esta migration UMA VEZ.
-- ============================================================


USE primeway_school;


-- ============================================================
-- 1. ANOS LETIVOS
-- ============================================================

CREATE TABLE anos_letivos (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    ano YEAR NOT NULL,

    data_inicio DATE NOT NULL,

    data_fim DATE NOT NULL,

    ativo TINYINT UNSIGNED NOT NULL DEFAULT 1,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_anos_letivos_ano (
        ano
    ),

    KEY idx_anos_letivos_ativo (
        ativo
    ),

    CONSTRAINT chk_anos_letivos_datas
        CHECK (
            data_fim >= data_inicio
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. PERÍODOS LETIVOS
-- ============================================================
--
-- Exemplos:
--
--   1º Bimestre
--   2º Bimestre
--   3º Bimestre
--   4º Bimestre
--
-- Também permite futuramente:
--
--   Trimestres
--   Semestres
--
-- sem alterar a estrutura.
-- ============================================================

CREATE TABLE periodos_letivos (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    ano_letivo_id BIGINT UNSIGNED NOT NULL,

    nome VARCHAR(40) NOT NULL,

    ordem TINYINT UNSIGNED NOT NULL,

    data_inicio DATE NOT NULL,

    data_fim DATE NOT NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_periodos_ano_ordem (
        ano_letivo_id,
        ordem
    ),

    UNIQUE KEY uq_periodos_ano_nome (
        ano_letivo_id,
        nome
    ),

    CONSTRAINT fk_periodos_ano_letivo
        FOREIGN KEY (
            ano_letivo_id
        )
        REFERENCES anos_letivos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_periodos_ordem
        CHECK (
            ordem > 0
        ),

    CONSTRAINT chk_periodos_datas
        CHECK (
            data_fim >= data_inicio
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. TURMAS
-- ============================================================
--
-- professor_id representa o professor principal/regente
-- da turma.
--
-- Professores específicos de cada disciplina serão ligados
-- posteriormente através de turma_disciplinas.
--
-- A quantidade de alunos NÃO é armazenada nesta tabela.
-- Será calculada através de matriculas.
-- ============================================================

CREATE TABLE turmas (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    ano_letivo_id BIGINT UNSIGNED NOT NULL,

    professor_id BIGINT UNSIGNED NULL,

    nome VARCHAR(50) NOT NULL,

    serie VARCHAR(30) NOT NULL,

    turno ENUM(
        'Manhã',
        'Tarde',
        'Integral'
    ) NOT NULL,

    sala VARCHAR(30) NULL,

    capacidade SMALLINT UNSIGNED
        NOT NULL DEFAULT 30,

    status ENUM(
        'Ativa',
        'Inativa'
    ) NOT NULL DEFAULT 'Ativa',

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_turmas_ano_nome (
        ano_letivo_id,
        nome
    ),

    KEY idx_turmas_professor (
        professor_id
    ),

    KEY idx_turmas_turno (
        turno
    ),

    KEY idx_turmas_status (
        status
    ),

    CONSTRAINT fk_turmas_ano_letivo
        FOREIGN KEY (
            ano_letivo_id
        )
        REFERENCES anos_letivos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_turmas_professor
        FOREIGN KEY (
            professor_id
        )
        REFERENCES professores (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_turmas_capacidade
        CHECK (
            capacidade > 0
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. DISCIPLINAS
-- ============================================================
--
-- Representa a disciplina em si:
--
--   Matemática
--   Língua Portuguesa
--   História
--   Ciências
--
-- Professor, turma e carga horária não pertencem diretamente
-- à disciplina.
--
-- Esses dados pertencem ao vínculo turma_disciplinas.
-- ============================================================

CREATE TABLE disciplinas (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    codigo VARCHAR(20) NOT NULL,

    nome VARCHAR(100) NOT NULL,

    area VARCHAR(60) NOT NULL,

    status ENUM(
        'Ativa',
        'Inativa'
    ) NOT NULL DEFAULT 'Ativa',

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_disciplinas_codigo (
        codigo
    ),

    KEY idx_disciplinas_nome (
        nome
    ),

    KEY idx_disciplinas_area (
        area
    ),

    KEY idx_disciplinas_status (
        status
    )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. MATRÍCULAS
-- ============================================================
--
-- Liga:
--
--   aluno
--      ↓
--   matrícula
--      ↓
--   turma
--
-- Isso substitui definitivamente o vínculo antigo por nome:
--
--   className = "1º Ano A"
--
-- numero_chamada é único dentro da turma quando informado.
--
-- Um histórico transferido ou concluído continua existindo.
-- ============================================================

CREATE TABLE matriculas (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    aluno_id BIGINT UNSIGNED NOT NULL,

    turma_id BIGINT UNSIGNED NOT NULL,

    numero_chamada SMALLINT UNSIGNED NULL,

    data_matricula DATE NOT NULL,

    situacao ENUM(
        'Ativa',
        'Transferida',
        'Concluída',
        'Cancelada'
    ) NOT NULL DEFAULT 'Ativa',

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_matriculas_aluno_turma (
        aluno_id,
        turma_id
    ),

    UNIQUE KEY uq_matriculas_turma_chamada (
        turma_id,
        numero_chamada
    ),

    KEY idx_matriculas_aluno (
        aluno_id
    ),

    KEY idx_matriculas_turma (
        turma_id
    ),

    KEY idx_matriculas_situacao (
        situacao
    ),

    CONSTRAINT fk_matriculas_aluno
        FOREIGN KEY (
            aluno_id
        )
        REFERENCES alunos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_matriculas_turma
        FOREIGN KEY (
            turma_id
        )
        REFERENCES turmas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 6. TURMA X DISCIPLINAS
-- ============================================================
--
-- Representa a oferta real de uma disciplina para uma turma.
--
-- Exemplo:
--
--   Turma:       1º Ano A
--   Disciplina:  Matemática
--   Professor:   Marcos Almeida
--   Carga:       160 horas
--
-- A mesma disciplina pode existir em várias turmas sem
-- duplicarmos o cadastro de disciplinas.
-- ============================================================

CREATE TABLE turma_disciplinas (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    turma_id BIGINT UNSIGNED NOT NULL,

    disciplina_id BIGINT UNSIGNED NOT NULL,

    professor_id BIGINT UNSIGNED NOT NULL,

    carga_horaria SMALLINT UNSIGNED NOT NULL,

    status ENUM(
        'Ativa',
        'Inativa'
    ) NOT NULL DEFAULT 'Ativa',

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_turma_disciplinas (
        turma_id,
        disciplina_id
    ),

    KEY idx_turma_disciplinas_professor (
        professor_id
    ),

    KEY idx_turma_disciplinas_status (
        status
    ),

    CONSTRAINT fk_turma_disciplinas_turma
        FOREIGN KEY (
            turma_id
        )
        REFERENCES turmas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_turma_disciplinas_disciplina
        FOREIGN KEY (
            disciplina_id
        )
        REFERENCES disciplinas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_turma_disciplinas_professor
        FOREIGN KEY (
            professor_id
        )
        REFERENCES professores (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_turma_disciplinas_carga
        CHECK (
            carga_horaria > 0
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 7. ANO LETIVO INICIAL
-- ============================================================

INSERT IGNORE INTO anos_letivos (
    ano,
    data_inicio,
    data_fim,
    ativo
)
VALUES (
    2026,
    '2026-02-02',
    '2026-12-18',
    1
);


-- ============================================================
-- 8. PERÍODOS INICIAIS
-- ============================================================
--
-- Não utilizamos ano_letivo_id = 1.
--
-- Localizamos o ID real do ano 2026.
-- ============================================================

INSERT IGNORE INTO periodos_letivos (
    ano_letivo_id,
    nome,
    ordem,
    data_inicio,
    data_fim
)
SELECT
    id,
    '1º Bimestre',
    1,
    '2026-02-02',
    '2026-04-17'
FROM anos_letivos
WHERE ano = 2026;


INSERT IGNORE INTO periodos_letivos (
    ano_letivo_id,
    nome,
    ordem,
    data_inicio,
    data_fim
)
SELECT
    id,
    '2º Bimestre',
    2,
    '2026-04-22',
    '2026-06-30'
FROM anos_letivos
WHERE ano = 2026;


INSERT IGNORE INTO periodos_letivos (
    ano_letivo_id,
    nome,
    ordem,
    data_inicio,
    data_fim
)
SELECT
    id,
    '3º Bimestre',
    3,
    '2026-07-20',
    '2026-09-30'
FROM anos_letivos
WHERE ano = 2026;


INSERT IGNORE INTO periodos_letivos (
    ano_letivo_id,
    nome,
    ordem,
    data_inicio,
    data_fim
)
SELECT
    id,
    '4º Bimestre',
    4,
    '2026-10-05',
    '2026-12-18'
FROM anos_letivos
WHERE ano = 2026;


-- ============================================================
-- 9. DISCIPLINAS INICIAIS
-- ============================================================

INSERT IGNORE INTO disciplinas (
    codigo,
    nome,
    area,
    status
)
VALUES

(
    'MAT01',
    'Matemática',
    'Matemática',
    'Ativa'
),

(
    'POR01',
    'Língua Portuguesa',
    'Linguagens',
    'Ativa'
),

(
    'CIE01',
    'Ciências',
    'Ciências da Natureza',
    'Ativa'
),

(
    'HIS01',
    'História',
    'Ciências Humanas',
    'Ativa'
),

(
    'ART01',
    'Arte',
    'Artes',
    'Ativa'
);


-- ============================================================
-- FIM DA MIGRATION 003
-- ============================================================
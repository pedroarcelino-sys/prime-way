-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 005 - CALENDÁRIO
-- ============================================================
--
-- Dependências:
--   002_pessoas.sql
--   003_academico.sql
--
-- Cria:
--
--   eventos_calendario
--
-- REGRAS:
--
--   - turma_id NULL representa evento geral da escola;
--   - turma_id preenchido representa evento de uma turma;
--   - eventos podem possuir ou não horário;
--   - eventos não serão apagados fisicamente como regra
--     normal de uso; poderão ser cancelados/inativados;
--   - regras de permissão serão tratadas posteriormente
--     no PHP.
--
-- Executar esta migration UMA VEZ.
-- ============================================================


USE primeway_school;


-- ============================================================
-- 1. EVENTOS DO CALENDÁRIO
-- ============================================================

CREATE TABLE eventos_calendario (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    turma_id BIGINT UNSIGNED NULL,

    criado_por_usuario_id BIGINT UNSIGNED NULL,

    titulo VARCHAR(190) NOT NULL,

    tipo VARCHAR(60) NOT NULL,

    data_evento DATE NOT NULL,

    horario_inicio TIME NULL,

    horario_fim TIME NULL,

    local VARCHAR(190) NULL,

    descricao TEXT NULL,

    status ENUM(
        'Agendado',
        'Concluído',
        'Cancelado'
    ) NOT NULL DEFAULT 'Agendado',

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_eventos_turma (
        turma_id
    ),

    KEY idx_eventos_criador (
        criado_por_usuario_id
    ),

    KEY idx_eventos_data (
        data_evento
    ),

    KEY idx_eventos_tipo (
        tipo
    ),

    KEY idx_eventos_status (
        status
    ),

    KEY idx_eventos_turma_data (
        turma_id,
        data_evento
    ),

    CONSTRAINT fk_eventos_turma
        FOREIGN KEY (
            turma_id
        )
        REFERENCES turmas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_eventos_criador
        FOREIGN KEY (
            criado_por_usuario_id
        )
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_eventos_horario
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
-- FIM DA MIGRATION 005
-- ============================================================
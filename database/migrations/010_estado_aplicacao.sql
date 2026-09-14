-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 010 - ESTADO COMPARTILHADO DA INTERFACE
-- ============================================================
--
-- Mantém no servidor os módulos que originalmente utilizavam
-- somente localStorage. O navegador passa a usar localStorage
-- apenas como cache de compatibilidade durante a migração gradual
-- para APIs relacionais específicas de cada domínio.
--
-- Executar esta migration UMA VEZ.
-- ============================================================

USE primeway_school;

CREATE TABLE estado_aplicacao (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    chave VARCHAR(80) NOT NULL,
    escopo VARCHAR(80) NOT NULL DEFAULT 'global',
    usuario_id BIGINT UNSIGNED NULL,
    valor_json JSON NOT NULL,
    atualizado_por_usuario_id BIGINT UNSIGNED NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_estado_chave_escopo (
        chave,
        escopo
    ),

    KEY idx_estado_usuario (
        usuario_id
    ),

    KEY idx_estado_atualizado_por (
        atualizado_por_usuario_id
    ),

    CONSTRAINT fk_estado_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_estado_atualizado_por
        FOREIGN KEY (atualizado_por_usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


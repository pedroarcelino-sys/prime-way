-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 012 - SAÍDA SEGURA / GPS
-- ============================================================
--
-- Cria a base para o fluxo:
-- Responsável solicita retirada -> navegador envia localização ->
-- sistema calcula distância -> ao entrar no raio configurado ->
-- equipe escolar recebe notificação.
--
-- IMPORTANTE:
-- latitude/longitude da escola NÃO são inventadas pela migration.
-- Devem ser configuradas pela administração antes do uso real.
-- ============================================================

USE primeway_school;


CREATE TABLE locais_saida_segura (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    nome VARCHAR(120) NOT NULL,

    latitude DECIMAL(10,7) NULL,

    longitude DECIMAL(10,7) NULL,

    raio_metros SMALLINT UNSIGNED NOT NULL
        DEFAULT 300,

    ativo TINYINT UNSIGNED NOT NULL
        DEFAULT 1,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_locais_saida_ativo (
        ativo
    ),

    CONSTRAINT chk_locais_saida_raio
        CHECK (
            raio_metros BETWEEN 30 AND 5000
        ),

    CONSTRAINT chk_locais_saida_ativo
        CHECK (
            ativo IN (0, 1)
        )
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE solicitacoes_saida_segura (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    aluno_id BIGINT UNSIGNED NOT NULL,

    responsavel_id BIGINT UNSIGNED NOT NULL,

    local_saida_id BIGINT UNSIGNED NOT NULL,

    status ENUM(
        'Aguardando',
        'No raio',
        'Preparando',
        'Liberado',
        'Cancelado'
    ) NOT NULL DEFAULT 'Aguardando',

    tipo_retirada ENUM(
        'Responsavel',
        'Transporte escolar'
    ) NOT NULL DEFAULT 'Responsavel',

    observacao VARCHAR(500) NULL,

    ultima_latitude DECIMAL(10,7) NULL,

    ultima_longitude DECIMAL(10,7) NULL,

    precisao_metros DECIMAL(8,2) NULL,

    distancia_metros DECIMAL(10,2) NULL,

    ultima_localizacao_em DATETIME NULL,

    solicitada_em DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    entrou_raio_em DATETIME NULL,

    preparando_em DATETIME NULL,

    liberado_em DATETIME NULL,

    cancelado_em DATETIME NULL,

    notificacao_disparada_em DATETIME NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_saida_aluno (
        aluno_id
    ),

    KEY idx_saida_responsavel (
        responsavel_id
    ),

    KEY idx_saida_local (
        local_saida_id
    ),

    KEY idx_saida_status (
        status
    ),

    KEY idx_saida_solicitada (
        solicitada_em
    ),

    CONSTRAINT fk_saida_aluno
        FOREIGN KEY (
            aluno_id
        )
        REFERENCES alunos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_saida_responsavel
        FOREIGN KEY (
            responsavel_id
        )
        REFERENCES responsaveis (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_saida_local
        FOREIGN KEY (
            local_saida_id
        )
        REFERENCES locais_saida_segura (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE historico_saida_segura (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    solicitacao_id BIGINT UNSIGNED NOT NULL,

    usuario_id BIGINT UNSIGNED NULL,

    status_anterior VARCHAR(30) NULL,

    status_novo VARCHAR(30) NOT NULL,

    observacao VARCHAR(500) NULL,

    criado_em DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_historico_saida_solicitacao (
        solicitacao_id,
        criado_em
    ),

    KEY idx_historico_saida_usuario (
        usuario_id
    ),

    CONSTRAINT fk_historico_saida_solicitacao
        FOREIGN KEY (
            solicitacao_id
        )
        REFERENCES solicitacoes_saida_segura (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_historico_saida_usuario
        FOREIGN KEY (
            usuario_id
        )
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


INSERT INTO locais_saida_segura (
    nome,
    latitude,
    longitude,
    raio_metros,
    ativo
)
VALUES (
    'Portaria principal',
    NULL,
    NULL,
    300,
    1
);


-- ============================================================
-- FIM DA MIGRATION 012
-- ============================================================

-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 011
-- MÓDULO COMPLETO DE ATIVIDADES
-- ============================================================
--
-- Expande o módulo acadêmico existente para suportar:
--
-- - criação/publicação de atividades;
-- - agendamento;
-- - entrega de texto;
-- - entrega por arquivo;
-- - entrega por link;
-- - rascunho;
-- - atraso;
-- - retirada;
-- - reenvio;
-- - histórico de versões;
-- - comentários aluno/professor;
-- - anexos do professor;
-- - anexos da entrega;
-- - arquivos de correção;
-- - feedback;
-- - publicação da correção;
--
-- A NOTA NÃO É DUPLICADA em entregas_atividades.
--
-- A nota oficial continua sendo armazenada em:
--
--   avaliacoes
--      ↓
--   notas
--
-- ============================================================


-- ============================================================
-- 1. EXPANDIR ATIVIDADES
-- ============================================================

ALTER TABLE atividades

    ADD COLUMN criado_por_usuario_id BIGINT UNSIGNED NULL
        AFTER periodo_letivo_id,

    ADD COLUMN instrucoes TEXT NULL
        AFTER descricao,

    ADD COLUMN tipo_entrega ENUM(
        'Texto',
        'Arquivo',
        'Texto e arquivo',
        'Link',
        'Livre'
    ) NOT NULL DEFAULT 'Livre'
        AFTER instrucoes,

    ADD COLUMN permite_atraso TINYINT(1)
        NOT NULL DEFAULT 0
        AFTER data_entrega,

    ADD COLUMN permite_reenvio TINYINT(1)
        NOT NULL DEFAULT 1
        AFTER permite_atraso,

    ADD COLUMN permite_comentarios TINYINT(1)
        NOT NULL DEFAULT 1
        AFTER permite_reenvio,

    ADD COLUMN max_arquivos TINYINT UNSIGNED
        NOT NULL DEFAULT 5
        AFTER permite_comentarios,

    ADD COLUMN tamanho_maximo_arquivo_mb SMALLINT UNSIGNED
        NOT NULL DEFAULT 20
        AFTER max_arquivos,

    MODIFY COLUMN status ENUM(
        'Rascunho',
        'Agendada',
        'Publicada',
        'Encerrada',
        'Cancelada'
    ) NOT NULL DEFAULT 'Rascunho',

    ADD KEY idx_atividades_criador (
        criado_por_usuario_id
    ),

    ADD CONSTRAINT fk_atividades_criador
        FOREIGN KEY (
            criado_por_usuario_id
        )
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    ADD CONSTRAINT chk_atividades_max_arquivos
        CHECK (
            max_arquivos >= 1
            AND max_arquivos <= 10
        ),

    ADD CONSTRAINT chk_atividades_tamanho_arquivo
        CHECK (
            tamanho_maximo_arquivo_mb >= 1
            AND tamanho_maximo_arquivo_mb <= 100
        );


-- ============================================================
-- 2. EXPANDIR ENTREGAS DOS ALUNOS
-- ============================================================

ALTER TABLE entregas_atividades

    ADD COLUMN link_resposta VARCHAR(1000) NULL
        AFTER conteudo,

    ADD COLUMN rascunho_salvo_em DATETIME NULL
        AFTER link_resposta,

    ADD COLUMN retirada_em DATETIME NULL
        AFTER entregue_em,

    ADD COLUMN devolvida_em DATETIME NULL
        AFTER retirada_em,

    ADD COLUMN corrigido_por_professor_id BIGINT UNSIGNED NULL
        AFTER corrigida_em,

    ADD COLUMN correcao_publicada_em DATETIME NULL
        AFTER corrigido_por_professor_id,

    ADD COLUMN ultima_versao SMALLINT UNSIGNED
        NOT NULL DEFAULT 0
        AFTER correcao_publicada_em,

    MODIFY COLUMN status ENUM(
        'Pendente',
        'Rascunho',
        'Entregue',
        'Atrasada',
        'Devolvida',
        'Reenviada',
        'Corrigida',
        'Cancelada'
    ) NOT NULL DEFAULT 'Pendente',

    ADD KEY idx_entregas_professor_correcao (
        corrigido_por_professor_id
    ),

    ADD CONSTRAINT fk_entregas_professor_correcao
        FOREIGN KEY (
            corrigido_por_professor_id
        )
        REFERENCES professores (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;


-- ============================================================
-- 3. ANEXOS DA ATIVIDADE
-- ============================================================
--
-- Arquivos publicados pelo professor:
--
--   atividade.pdf
--   instrucoes.pdf
--   imagem.png
--   modelo.docx
--
-- O arquivo físico NÃO fica no banco.
--
-- O banco guarda apenas os metadados e a chave de armazenamento.
-- ============================================================

CREATE TABLE atividade_anexos (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    atividade_id BIGINT UNSIGNED NOT NULL,

    criado_por_usuario_id BIGINT UNSIGNED NULL,

    nome_original VARCHAR(255) NOT NULL,

    nome_armazenado VARCHAR(255) NOT NULL,

    storage_key VARCHAR(500) NOT NULL,

    mime_type VARCHAR(150) NOT NULL,

    tamanho_bytes BIGINT UNSIGNED NOT NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_atividade_anexos_atividade (
        atividade_id
    ),

    KEY idx_atividade_anexos_usuario (
        criado_por_usuario_id
    ),

    CONSTRAINT fk_atividade_anexos_atividade
        FOREIGN KEY (
            atividade_id
        )
        REFERENCES atividades (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_atividade_anexos_usuario
        FOREIGN KEY (
            criado_por_usuario_id
        )
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_atividade_anexos_tamanho
        CHECK (
            tamanho_bytes > 0
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. HISTÓRICO DE VERSÕES DA ENTREGA
-- ============================================================
--
-- Exemplo:
--
-- Pedro envia versão 1 às 19:20.
-- Pedro retira.
-- Pedro envia versão 2 às 20:10.
--
-- A interface mostra a versão atual.
-- O histórico continua armazenado.
-- ============================================================

CREATE TABLE entrega_atividade_versoes (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    entrega_id BIGINT UNSIGNED NOT NULL,

    numero_versao SMALLINT UNSIGNED NOT NULL,

    conteudo TEXT NULL,

    link_resposta VARCHAR(1000) NULL,

    status ENUM(
        'Rascunho',
        'Enviada',
        'Retirada'
    ) NOT NULL DEFAULT 'Rascunho',

    salva_em DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    enviada_em DATETIME NULL,

    retirada_em DATETIME NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_entrega_versao (
        entrega_id,
        numero_versao
    ),

    KEY idx_entrega_versoes_status (
        status
    ),

    KEY idx_entrega_versoes_enviada (
        enviada_em
    ),

    CONSTRAINT fk_entrega_versoes_entrega
        FOREIGN KEY (
            entrega_id
        )
        REFERENCES entregas_atividades (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_entrega_versoes_numero
        CHECK (
            numero_versao > 0
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. ARQUIVOS ENVIADOS PELO ALUNO
-- ============================================================

CREATE TABLE entrega_atividade_arquivos (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    versao_id BIGINT UNSIGNED NOT NULL,

    nome_original VARCHAR(255) NOT NULL,

    nome_armazenado VARCHAR(255) NOT NULL,

    storage_key VARCHAR(500) NOT NULL,

    mime_type VARCHAR(150) NOT NULL,

    tamanho_bytes BIGINT UNSIGNED NOT NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_entrega_arquivos_versao (
        versao_id
    ),

    CONSTRAINT fk_entrega_arquivos_versao
        FOREIGN KEY (
            versao_id
        )
        REFERENCES entrega_atividade_versoes (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_entrega_arquivos_tamanho
        CHECK (
            tamanho_bytes > 0
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 6. COMENTÁRIOS ALUNO <-> PROFESSOR
-- ============================================================
--
-- Os comentários pertencem à entrega específica.
--
-- Portanto:
--
-- atividade
--      ↓
-- entrega do aluno
--      ↓
-- comentários
--
-- Um aluno não poderá visualizar comentários de outro aluno.
-- Essa permissão será garantida pela API PHP.
-- ============================================================

CREATE TABLE atividade_comentarios (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    entrega_id BIGINT UNSIGNED NOT NULL,

    usuario_id BIGINT UNSIGNED NOT NULL,

    comentario TEXT NOT NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    editado_em DATETIME NULL,

    excluido_em DATETIME NULL,

    PRIMARY KEY (id),

    KEY idx_atividade_comentarios_entrega (
        entrega_id
    ),

    KEY idx_atividade_comentarios_usuario (
        usuario_id
    ),

    KEY idx_atividade_comentarios_criado (
        criado_em
    ),

    CONSTRAINT fk_atividade_comentarios_entrega
        FOREIGN KEY (
            entrega_id
        )
        REFERENCES entregas_atividades (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_atividade_comentarios_usuario
        FOREIGN KEY (
            usuario_id
        )
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 7. ARQUIVOS DE CORREÇÃO DO PROFESSOR
-- ============================================================
--
-- Exemplo:
--
-- correcao_pedro.pdf
-- atividade_corrigida.pdf
-- observacoes.docx
--
-- A nota continua na tabela notas.
-- ============================================================

CREATE TABLE entrega_correcao_arquivos (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    entrega_id BIGINT UNSIGNED NOT NULL,

    professor_id BIGINT UNSIGNED NOT NULL,

    nome_original VARCHAR(255) NOT NULL,

    nome_armazenado VARCHAR(255) NOT NULL,

    storage_key VARCHAR(500) NOT NULL,

    mime_type VARCHAR(150) NOT NULL,

    tamanho_bytes BIGINT UNSIGNED NOT NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_correcao_arquivos_entrega (
        entrega_id
    ),

    KEY idx_correcao_arquivos_professor (
        professor_id
    ),

    CONSTRAINT fk_correcao_arquivos_entrega
        FOREIGN KEY (
            entrega_id
        )
        REFERENCES entregas_atividades (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_correcao_arquivos_professor
        FOREIGN KEY (
            professor_id
        )
        REFERENCES professores (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_correcao_arquivos_tamanho
        CHECK (
            tamanho_bytes > 0
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- FIM DA MIGRATION 011
-- ============================================================
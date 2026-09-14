-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 009 - AUDITORIA
-- ============================================================
--
-- Dependência:
--   usuarios
--
-- Cria:
--
--   auditoria
--
-- OBJETIVO:
--
-- Registrar ações relevantes realizadas no sistema.
--
-- Exemplos:
--
--   LOGIN
--   LOGOUT
--   CRIAR_ALUNO
--   ALTERAR_ALUNO
--   INATIVAR_USUARIO
--   LANCAR_NOTA
--   ALTERAR_NOTA
--   REGISTRAR_FREQUENCIA
--   CRIAR_EVENTO
--   PUBLICAR_NOTIFICACAO
--
-- A tabela é genérica de propósito.
--
-- Novos tipos de ação poderão ser registrados futuramente
-- sem necessidade de alterar a estrutura do banco.
--
-- IMPORTANTE:
--
--   - usuario_id pode ser NULL para ações automáticas
--     realizadas pelo próprio sistema;
--
--   - entidade indica sobre qual tipo de registro ocorreu
--     a ação;
--
--   - registro_id identifica o registro afetado quando
--     existir;
--
--   - dados_anteriores e dados_novos armazenam informações
--     estruturadas em JSON;
--
--   - SENHAS, hashes de senha, tokens, sessões e outros
--     segredos NÃO devem ser gravados nos campos de auditoria;
--
--   - a sanitização dos dados será responsabilidade do PHP;
--
--   - registros de auditoria não devem ser alterados ou
--     excluídos durante o uso normal do sistema.
--
-- Executar esta migration UMA VEZ.
-- ============================================================


USE primeway_school;


-- ============================================================
-- 1. AUDITORIA
-- ============================================================

CREATE TABLE auditoria (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    usuario_id BIGINT UNSIGNED NULL,

    acao VARCHAR(60) NOT NULL,

    entidade VARCHAR(100) NULL,

    registro_id BIGINT UNSIGNED NULL,

    descricao VARCHAR(500) NULL,

    dados_anteriores JSON NULL,

    dados_novos JSON NULL,

    endereco_ip VARCHAR(45) NULL,

    user_agent VARCHAR(500) NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_auditoria_usuario (
        usuario_id
    ),

    KEY idx_auditoria_acao (
        acao
    ),

    KEY idx_auditoria_entidade (
        entidade
    ),

    KEY idx_auditoria_entidade_registro (
        entidade,
        registro_id
    ),

    KEY idx_auditoria_criado_em (
        criado_em
    ),

    KEY idx_auditoria_usuario_data (
        usuario_id,
        criado_em
    ),

    CONSTRAINT fk_auditoria_usuario
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
-- FIM DA MIGRATION 009
-- ============================================================
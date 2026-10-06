-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 018 - CHAT / ENTREGA DE MENSAGENS
-- ============================================================
--
-- Registra quando uma mensagem chegou ao usuário destinatário.
-- A leitura continua sendo controlada separadamente por
-- mensagem_leituras.
--
-- Estados derivados:
--   enviada  -> salva no servidor;
--   entregue -> destinatário sincronizou o Chat;
--   lida     -> destinatário abriu/leu a conversa.
-- ============================================================

USE primeway_school;

CREATE TABLE IF NOT EXISTS mensagem_entregas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    mensagem_id BIGINT UNSIGNED NOT NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    entregue_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_mensagem_entrega (
        mensagem_id,
        usuario_id
    ),

    KEY idx_entregas_usuario (
        usuario_id
    ),

    KEY idx_entregas_usuario_data (
        usuario_id,
        entregue_em
    ),

    CONSTRAINT fk_entregas_mensagem
        FOREIGN KEY (mensagem_id)
        REFERENCES mensagens (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_entregas_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FIM DA MIGRATION 018
-- ============================================================

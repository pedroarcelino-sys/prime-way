-- ============================================================
-- PRIMEWAY SCHOOL
-- 014 - SUSPENSÃO ADMINISTRATIVA DO CHAT
-- ============================================================

ALTER TABLE usuarios
    ADD COLUMN chat_suspenso TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER ativo,
    ADD COLUMN chat_suspenso_em DATETIME NULL AFTER chat_suspenso,
    ADD COLUMN chat_suspenso_por_usuario_id BIGINT UNSIGNED NULL AFTER chat_suspenso_em,
    ADD COLUMN chat_suspensao_motivo VARCHAR(255) NULL AFTER chat_suspenso_por_usuario_id,
    ADD KEY idx_usuarios_chat_suspenso (chat_suspenso),
    ADD KEY idx_usuarios_chat_suspenso_por (chat_suspenso_por_usuario_id),
    ADD CONSTRAINT fk_usuarios_chat_suspenso_por
        FOREIGN KEY (chat_suspenso_por_usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    ADD CONSTRAINT chk_usuarios_chat_suspenso
        CHECK (chat_suspenso IN (0, 1));

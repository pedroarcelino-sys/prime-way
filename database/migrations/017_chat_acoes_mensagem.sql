-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 017 - CHAT / AÇÕES DE MENSAGEM
-- ============================================================
--
-- Adiciona suporte a:
--   - fixar/desafixar mensagens;
--   - registrar quem excluiu uma mensagem própria.
--
-- A exclusão continua lógica usando mensagens.excluida_em.
-- ============================================================

USE primeway_school;

ALTER TABLE mensagens
    ADD COLUMN fixada_em DATETIME NULL AFTER excluida_em,
    ADD COLUMN fixada_por_usuario_id BIGINT UNSIGNED NULL AFTER fixada_em,
    ADD COLUMN excluida_por_usuario_id BIGINT UNSIGNED NULL AFTER fixada_por_usuario_id,
    ADD KEY idx_mensagens_conversa_fixada (conversa_id, fixada_em),
    ADD KEY idx_mensagens_fixada_por (fixada_por_usuario_id),
    ADD KEY idx_mensagens_excluida_por (excluida_por_usuario_id),
    ADD CONSTRAINT fk_mensagens_fixada_por
        FOREIGN KEY (fixada_por_usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    ADD CONSTRAINT fk_mensagens_excluida_por
        FOREIGN KEY (excluida_por_usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;

-- ============================================================
-- FIM DA MIGRATION 017
-- ============================================================

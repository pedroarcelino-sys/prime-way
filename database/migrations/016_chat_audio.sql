-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 016 - CHAT / ÁUDIO
-- ============================================================
--
-- Adiciona o tipo "audio" às mensagens do Chat.
-- Os arquivos de áudio continuam armazenados fora do MySQL,
-- usando mensagem_anexos para guardar apenas metadados.
-- ============================================================

USE primeway_school;

ALTER TABLE mensagens
    MODIFY COLUMN tipo ENUM(
        'texto',
        'arquivo',
        'audio',
        'misto',
        'sistema'
    ) NOT NULL DEFAULT 'texto';

-- ============================================================
-- FIM DA MIGRATION 016
-- ============================================================

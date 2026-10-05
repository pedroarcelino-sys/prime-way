-- ============================================================
-- PRIMEWAY SCHOOL
-- 015 - RECONCILIAÇÃO DA PRIVACIDADE DA SAÍDA SEGURA
-- ============================================================
--
-- Esta migration normaliza bancos que já receberam parte da antiga
-- estrutura de GPS antes do controle por schema_migrations.
-- Ela é idempotente: só remove FK/colunas/tabela se ainda existirem.
-- ============================================================

SET @fk_saida_local := (
    SELECT kcu.CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = DATABASE()
      AND kcu.TABLE_NAME = 'solicitacoes_saida_segura'
      AND kcu.COLUMN_NAME = 'local_saida_id'
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
);

SET @sql := IF(
    @fk_saida_local IS NOT NULL,
    CONCAT(
        'ALTER TABLE solicitacoes_saida_segura DROP FOREIGN KEY `',
        REPLACE(@fk_saida_local, '`', '``'),
        '`'
    ),
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'solicitacoes_saida_segura'
      AND COLUMN_NAME = 'local_saida_id'
);
SET @sql := IF(
    @col_exists > 0,
    'ALTER TABLE solicitacoes_saida_segura DROP COLUMN `local_saida_id`',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'solicitacoes_saida_segura'
      AND COLUMN_NAME = 'ultima_latitude'
);
SET @sql := IF(
    @col_exists > 0,
    'ALTER TABLE solicitacoes_saida_segura DROP COLUMN `ultima_latitude`',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'solicitacoes_saida_segura'
      AND COLUMN_NAME = 'ultima_longitude'
);
SET @sql := IF(
    @col_exists > 0,
    'ALTER TABLE solicitacoes_saida_segura DROP COLUMN `ultima_longitude`',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'solicitacoes_saida_segura'
      AND COLUMN_NAME = 'precisao_metros'
);
SET @sql := IF(
    @col_exists > 0,
    'ALTER TABLE solicitacoes_saida_segura DROP COLUMN `precisao_metros`',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'solicitacoes_saida_segura'
      AND COLUMN_NAME = 'distancia_metros'
);
SET @sql := IF(
    @col_exists > 0,
    'ALTER TABLE solicitacoes_saida_segura DROP COLUMN `distancia_metros`',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'solicitacoes_saida_segura'
      AND COLUMN_NAME = 'ultima_localizacao_em'
);
SET @sql := IF(
    @col_exists > 0,
    'ALTER TABLE solicitacoes_saida_segura DROP COLUMN `ultima_localizacao_em`',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP TABLE IF EXISTS locais_saida_segura;

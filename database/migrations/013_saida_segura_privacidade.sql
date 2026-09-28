-- PRIMEWAY SCHOOL
-- MIGRATION 013 - SAÍDA SEGURA SEM ARMAZENAR COORDENADAS

USE primeway_school;

ALTER TABLE solicitacoes_saida_segura
    DROP FOREIGN KEY fk_saida_local;

ALTER TABLE solicitacoes_saida_segura
    DROP INDEX idx_saida_local;

ALTER TABLE solicitacoes_saida_segura
    DROP COLUMN local_saida_id,
    DROP COLUMN ultima_latitude,
    DROP COLUMN ultima_longitude,
    DROP COLUMN precisao_metros,
    DROP COLUMN distancia_metros,
    DROP COLUMN ultima_localizacao_em;

DROP TABLE locais_saida_segura;

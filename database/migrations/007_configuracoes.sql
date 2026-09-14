-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 007 - CONFIGURAÇÕES DO SISTEMA
-- ============================================================
--
-- Dependência:
--   002_pessoas.sql
--
-- Cria:
--
--   configuracoes_sistema
--
-- PRINCÍPIOS:
--
--   - configurações operacionais ficam centralizadas;
--   - ano letivo NÃO é duplicado nesta tabela;
--   - o ano letivo oficial continua em anos_letivos;
--   - períodos oficiais continuam em periodos_letivos;
--   - valores podem possuir diferentes tipos;
--   - nenhuma senha ou segredo será armazenado aqui;
--   - alterações podem registrar qual usuário as realizou.
--
-- Executar esta migration UMA VEZ.
-- ============================================================


USE primeway_school;


-- ============================================================
-- 1. CONFIGURAÇÕES DO SISTEMA
-- ============================================================
--
-- Exemplos:
--
-- grupo: escola
-- chave: nome
--
-- grupo: academico
-- chave: media_aprovacao
--
-- grupo: sistema
-- chave: fuso_horario
--
-- O campo tipo informa ao PHP como interpretar valor.
-- ============================================================

CREATE TABLE configuracoes_sistema (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    grupo VARCHAR(60) NOT NULL,

    chave VARCHAR(100) NOT NULL,

    valor TEXT NULL,

    tipo ENUM(
        'texto',
        'inteiro',
        'decimal',
        'booleano',
        'json'
    ) NOT NULL DEFAULT 'texto',

    descricao VARCHAR(255) NULL,

    editavel TINYINT UNSIGNED NOT NULL DEFAULT 1,

    atualizado_por_usuario_id BIGINT UNSIGNED NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_configuracoes_grupo_chave (
        grupo,
        chave
    ),

    KEY idx_configuracoes_grupo (
        grupo
    ),

    KEY idx_configuracoes_chave (
        chave
    ),

    KEY idx_configuracoes_usuario (
        atualizado_por_usuario_id
    ),

    CONSTRAINT fk_configuracoes_usuario
        FOREIGN KEY (
            atualizado_por_usuario_id
        )
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_configuracoes_editavel
        CHECK (
            editavel IN (0, 1)
        )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. CONFIGURAÇÕES DA ESCOLA
-- ============================================================

INSERT IGNORE INTO configuracoes_sistema (
    grupo,
    chave,
    valor,
    tipo,
    descricao,
    editavel
)
VALUES

(
    'escola',
    'nome',
    'PrimeWay School',
    'texto',
    'Nome de exibição da escola.',
    1
),

(
    'escola',
    'razao_social',
    NULL,
    'texto',
    'Razão social da instituição.',
    1
),

(
    'escola',
    'documento',
    NULL,
    'texto',
    'Documento da instituição.',
    1
),

(
    'escola',
    'diretor',
    NULL,
    'texto',
    'Nome do responsável pela direção.',
    1
),

(
    'escola',
    'email',
    NULL,
    'texto',
    'E-mail institucional de contato.',
    1
),

(
    'escola',
    'telefone',
    NULL,
    'texto',
    'Telefone institucional.',
    1
),

(
    'escola',
    'endereco',
    NULL,
    'texto',
    'Endereço da instituição.',
    1
),

(
    'escola',
    'cidade',
    NULL,
    'texto',
    'Cidade da instituição.',
    1
),

(
    'escola',
    'estado',
    NULL,
    'texto',
    'Estado da instituição.',
    1
),

(
    'escola',
    'cep',
    NULL,
    'texto',
    'CEP da instituição.',
    1
);


-- ============================================================
-- 3. CONFIGURAÇÕES ACADÊMICAS
-- ============================================================
--
-- IMPORTANTE:
--
-- Não armazenamos aqui:
--
--   ano atual = 2026
--
-- pois anos_letivos é a fonte oficial dessa informação.
--
-- modelo_periodos_padrao serve apenas como configuração
-- para criação futura de novos anos letivos.
-- ============================================================

INSERT IGNORE INTO configuracoes_sistema (
    grupo,
    chave,
    valor,
    tipo,
    descricao,
    editavel
)
VALUES

(
    'academico',
    'modelo_periodos_padrao',
    'Bimestral',
    'texto',
    'Modelo padrão sugerido ao criar novos períodos letivos.',
    1
),

(
    'academico',
    'media_aprovacao',
    '6.00',
    'decimal',
    'Média mínima padrão para aprovação.',
    1
),

(
    'academico',
    'frequencia_minima',
    '75.00',
    'decimal',
    'Percentual mínimo padrão de frequência.',
    1
),

(
    'academico',
    'duracao_aula_minutos',
    '50',
    'inteiro',
    'Duração padrão de uma aula em minutos.',
    1
),

(
    'academico',
    'dias_letivos',
    '200',
    'inteiro',
    'Quantidade padrão de dias letivos.',
    1
),

(
    'academico',
    'turno_padrao',
    'Manhã',
    'texto',
    'Turno sugerido inicialmente no cadastro de turmas.',
    1
);


-- ============================================================
-- 4. CONFIGURAÇÕES DE NOTIFICAÇÕES
-- ============================================================
--
-- 1 = habilitado
-- 0 = desabilitado
--
-- São preferências gerais da escola.
--
-- Não substituem notificacao_destinatarios.
-- ============================================================

INSERT IGNORE INTO configuracoes_sistema (
    grupo,
    chave,
    valor,
    tipo,
    descricao,
    editavel
)
VALUES

(
    'notificacoes',
    'calendario',
    '1',
    'booleano',
    'Habilita notificações relacionadas ao calendário.',
    1
),

(
    'notificacoes',
    'comunicados',
    '1',
    'booleano',
    'Habilita notificações de comunicados.',
    1
),

(
    'notificacoes',
    'notas',
    '1',
    'booleano',
    'Habilita notificações relacionadas a notas.',
    1
),

(
    'notificacoes',
    'frequencia',
    '1',
    'booleano',
    'Habilita notificações relacionadas à frequência.',
    1
),

(
    'notificacoes',
    'responsaveis',
    '1',
    'booleano',
    'Habilita notificações destinadas a responsáveis.',
    1
);


-- ============================================================
-- 5. CONFIGURAÇÕES DO SISTEMA
-- ============================================================

INSERT IGNORE INTO configuracoes_sistema (
    grupo,
    chave,
    valor,
    tipo,
    descricao,
    editavel
)
VALUES

(
    'sistema',
    'formato_data',
    'DD/MM/YYYY',
    'texto',
    'Formato padrão utilizado para apresentação de datas.',
    1
),

(
    'sistema',
    'pagina_padrao',
    'dashboard',
    'texto',
    'Página padrão após autenticação quando aplicável.',
    1
),

(
    'sistema',
    'fuso_horario',
    'America/Sao_Paulo',
    'texto',
    'Fuso horário padrão da aplicação.',
    1
);


-- ============================================================
-- FIM DA MIGRATION 007
-- ============================================================
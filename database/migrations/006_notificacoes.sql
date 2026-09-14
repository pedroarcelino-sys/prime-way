-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 006 - NOTIFICAÇÕES
-- ============================================================
--
-- Dependências:
--   002_pessoas.sql
--   005_calendario.sql
--
-- Cria:
--
--   notificacoes
--   notificacao_destinatarios
--
-- PRINCÍPIOS:
--
--   - a notificação é o conteúdo publicado;
--   - os destinatários ficam em tabela separada;
--   - leitura é individual por usuário;
--   - exclusão é individual por usuário;
--   - uma notificação pode estar ligada a um evento;
--   - regras de quem recebe cada notificação serão
--     implementadas posteriormente no PHP;
--   - não existe "read = true" global na notificação.
--
-- Executar esta migration UMA VEZ.
-- ============================================================


USE primeway_school;


-- ============================================================
-- 1. NOTIFICAÇÕES
-- ============================================================
--
-- Exemplos:
--
--   Aviso geral da escola
--   Novo evento no calendário
--   Alteração de evento
--   Publicação de nota
--   Aviso de frequência
--   Comunicado administrativo
--
-- publico:
--
--   armazena uma descrição geral da audiência pretendida.
--
-- Exemplos:
--
--   Todos
--   Professores
--   Alunos
--   Responsáveis
--   Secretaria
--   Turma
--   Personalizado
--
-- Os destinatários REAIS ficam em:
--
--   notificacao_destinatarios
--
-- origem:
--
--   identifica de onde surgiu a notificação.
--
-- Exemplos:
--
--   Manual
--   Calendario
--   Academico
--   Sistema
--
-- evento_calendario_id:
--
--   usado quando a notificação estiver relacionada
--   a um evento do calendário.
-- ============================================================

CREATE TABLE notificacoes (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    criado_por_usuario_id BIGINT UNSIGNED NULL,

    evento_calendario_id BIGINT UNSIGNED NULL,

    titulo VARCHAR(190) NOT NULL,

    tipo VARCHAR(60) NOT NULL,

    publico VARCHAR(60) NOT NULL,

    mensagem TEXT NOT NULL,

    origem VARCHAR(40) NOT NULL
        DEFAULT 'Manual',

    status ENUM(
        'Rascunho',
        'Agendada',
        'Publicada',
        'Cancelada'
    ) NOT NULL DEFAULT 'Rascunho',

    agendada_para DATETIME NULL,

    publicada_em DATETIME NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_notificacoes_criador (
        criado_por_usuario_id
    ),

    KEY idx_notificacoes_evento (
        evento_calendario_id
    ),

    KEY idx_notificacoes_tipo (
        tipo
    ),

    KEY idx_notificacoes_publico (
        publico
    ),

    KEY idx_notificacoes_origem (
        origem
    ),

    KEY idx_notificacoes_status (
        status
    ),

    KEY idx_notificacoes_agendada (
        agendada_para
    ),

    KEY idx_notificacoes_publicada (
        publicada_em
    ),

    CONSTRAINT fk_notificacoes_criador
        FOREIGN KEY (
            criado_por_usuario_id
        )
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_notificacoes_evento
        FOREIGN KEY (
            evento_calendario_id
        )
        REFERENCES eventos_calendario (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. DESTINATÁRIOS
-- ============================================================
--
-- Cada linha significa:
--
--   "este usuário recebeu esta notificação"
--
-- Exemplo:
--
--   Notificação 20
--
--      Admin        -> lida
--      Professor    -> lida
--      Aluno        -> não lida
--      Responsável  -> não lida
--
-- lida_em:
--
--   NULL = ainda não leu
--   preenchido = já leu
--
-- excluida_em:
--
--   exclusão somente para aquele destinatário.
--
-- Portanto um responsável pode remover uma notificação
-- da própria tela sem removê-la para todos os outros.
-- ============================================================

CREATE TABLE notificacao_destinatarios (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    notificacao_id BIGINT UNSIGNED NOT NULL,

    usuario_id BIGINT UNSIGNED NOT NULL,

    recebida_em DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    lida_em DATETIME NULL,

    excluida_em DATETIME NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_notificacao_destinatario (
        notificacao_id,
        usuario_id
    ),

    KEY idx_destinatarios_usuario (
        usuario_id
    ),

    KEY idx_destinatarios_notificacao (
        notificacao_id
    ),

    KEY idx_destinatarios_usuario_leitura (
        usuario_id,
        lida_em
    ),

    KEY idx_destinatarios_usuario_exclusao (
        usuario_id,
        excluida_em
    ),

    KEY idx_destinatarios_caixa_entrada (
        usuario_id,
        excluida_em,
        lida_em,
        recebida_em
    ),

    CONSTRAINT fk_destinatarios_notificacao
        FOREIGN KEY (
            notificacao_id
        )
        REFERENCES notificacoes (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_destinatarios_usuario
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
-- FIM DA MIGRATION 006
-- ============================================================
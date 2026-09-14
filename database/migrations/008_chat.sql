-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 008 - CHAT
-- ============================================================
--
-- Dependência:
--   002_pessoas.sql
--
-- Esta migration cria a estrutura definitiva do Chat:
--
--   conversas
--   conversa_participantes
--   mensagens
--   mensagem_anexos
--   mensagem_leituras
--
-- IMPORTANTE:
--
-- O banco NÃO define nesta etapa:
--
--   - quem pode conversar com quem;
--   - restrições por perfil;
--   - restrições por turma;
--   - vínculos Professor x Aluno;
--   - vínculos Responsável x Aluno.
--
-- Essas regras serão implementadas posteriormente no PHP,
-- quando as regras de negócio forem definidas.
--
-- O banco apenas garante a integridade estrutural.
--
-- Executar esta migration UMA VEZ.
-- ============================================================


USE primeway_school;


-- ============================================================
-- 1. CONVERSAS
-- ============================================================
--
-- Uma conversa pode ser:
--
--   individual
--   grupo
--
-- Exemplos:
--
--   Professor x Responsável
--   Professor x Aluno
--   Administração x Professor
--   Grupo de uma turma
--   Grupo de um setor
--
-- O banco não restringe os perfis participantes.
-- ============================================================

CREATE TABLE conversas (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    tipo ENUM(
        'individual',
        'grupo'
    ) NOT NULL DEFAULT 'individual',

    titulo VARCHAR(190) NULL,

    descricao VARCHAR(500) NULL,

    criada_por_usuario_id BIGINT UNSIGNED NULL,

    ativo TINYINT UNSIGNED NOT NULL DEFAULT 1,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_conversas_tipo (
        tipo
    ),

    KEY idx_conversas_criador (
        criada_por_usuario_id
    ),

    KEY idx_conversas_ativo (
        ativo
    ),

    CONSTRAINT fk_conversas_criador
        FOREIGN KEY (
            criada_por_usuario_id
        )
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. PARTICIPANTES
-- ============================================================
--
-- Liga usuários às conversas.
--
-- Não existe regra de perfil nesta tabela.
--
-- Isso permite futuramente:
--
--   Admin
--   Professor
--   Aluno
--   Responsável
--   Secretaria
--
-- participarem do Chat conforme as regras que definirmos.
--
-- arquivada_em:
--   usuário arquivou a conversa somente para ele.
--
-- saiu_em:
--   usuário deixou de participar.
--
-- ultima_visualizacao_em:
--   auxilia futuras consultas de conversas e mensagens.
-- ============================================================

CREATE TABLE conversa_participantes (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    conversa_id BIGINT UNSIGNED NOT NULL,

    usuario_id BIGINT UNSIGNED NOT NULL,

    ativo TINYINT UNSIGNED NOT NULL DEFAULT 1,

    entrou_em DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    saiu_em DATETIME NULL,

    arquivada_em DATETIME NULL,

    ultima_visualizacao_em DATETIME NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_conversa_participante (
        conversa_id,
        usuario_id
    ),

    KEY idx_participantes_usuario (
        usuario_id
    ),

    KEY idx_participantes_usuario_ativo (
        usuario_id,
        ativo
    ),

    KEY idx_participantes_conversa_ativo (
        conversa_id,
        ativo
    ),

    CONSTRAINT fk_participantes_conversa
        FOREIGN KEY (
            conversa_id
        )
        REFERENCES conversas (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_participantes_usuario
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
-- 3. MENSAGENS
-- ============================================================
--
-- Cada mensagem pertence a uma conversa e possui um remetente.
--
-- Não utilizamos:
--
--   sent
--   received
--
-- como acontece no protótipo.
--
-- No sistema real basta comparar:
--
--   remetente_usuario_id
--
-- com o usuário autenticado.
--
-- respondendo_mensagem_id permite implementar futuramente:
--
--   "Responder mensagem"
--
-- excluida_em representa exclusão lógica.
--
-- A mensagem continua existindo no banco para preservar
-- integridade e histórico.
-- ============================================================

CREATE TABLE mensagens (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    conversa_id BIGINT UNSIGNED NOT NULL,

    remetente_usuario_id BIGINT UNSIGNED NOT NULL,

    tipo ENUM(
        'texto',
        'arquivo',
        'misto',
        'sistema'
    ) NOT NULL DEFAULT 'texto',

    conteudo TEXT NULL,

    respondendo_mensagem_id BIGINT UNSIGNED NULL,

    enviada_em DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    editada_em DATETIME NULL,

    excluida_em DATETIME NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_mensagens_conversa (
        conversa_id
    ),

    KEY idx_mensagens_conversa_data (
        conversa_id,
        enviada_em,
        id
    ),

    KEY idx_mensagens_remetente (
        remetente_usuario_id
    ),

    KEY idx_mensagens_resposta (
        respondendo_mensagem_id
    ),

    KEY idx_mensagens_excluida (
        excluida_em
    ),

    CONSTRAINT fk_mensagens_conversa
        FOREIGN KEY (
            conversa_id
        )
        REFERENCES conversas (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_mensagens_remetente_participante
        FOREIGN KEY (
            conversa_id,
            remetente_usuario_id
        )
        REFERENCES conversa_participantes (
            conversa_id,
            usuario_id
        )
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_mensagens_resposta
        FOREIGN KEY (
            respondendo_mensagem_id
        )
        REFERENCES mensagens (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. ANEXOS
-- ============================================================
--
-- O arquivo propriamente dito NÃO será armazenado dentro
-- do MySQL.
--
-- O banco guardará apenas as informações necessárias para
-- localizar e validar o arquivo armazenado pelo servidor.
--
-- Exemplo futuro:
--
--   /storage/chat/2026/09/arquivo-gerado.pdf
--
-- nome_original:
--   nome que a pessoa tinha no computador.
--
-- nome_arquivo:
--   nome seguro gerado pelo servidor.
--
-- caminho:
--   localização interna utilizada pelo PHP.
-- ============================================================

CREATE TABLE mensagem_anexos (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    mensagem_id BIGINT UNSIGNED NOT NULL,

    nome_original VARCHAR(255) NOT NULL,

    nome_arquivo VARCHAR(255) NOT NULL,

    mime_type VARCHAR(150) NULL,

    tamanho_bytes BIGINT UNSIGNED NULL,

    caminho VARCHAR(500) NOT NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_anexos_mensagem (
        mensagem_id
    ),

    CONSTRAINT fk_anexos_mensagem
        FOREIGN KEY (
            mensagem_id
        )
        REFERENCES mensagens (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. LEITURA DAS MENSAGENS
-- ============================================================
--
-- Cada usuário possui seu próprio registro de leitura.
--
-- Portanto uma mensagem pode estar:
--
--   lida pelo Professor
--   não lida pelo Aluno
--   lida pelo Responsável
--
-- simultaneamente.
--
-- Não armazenamos um simples:
--
--   read = true
--
-- na própria mensagem.
--
-- Essa estrutura permite calcular corretamente a quantidade
-- de mensagens não lidas para cada usuário.
-- ============================================================

CREATE TABLE mensagem_leituras (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    mensagem_id BIGINT UNSIGNED NOT NULL,

    usuario_id BIGINT UNSIGNED NOT NULL,

    lida_em DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_mensagem_leitura (
        mensagem_id,
        usuario_id
    ),

    KEY idx_leituras_usuario (
        usuario_id
    ),

    KEY idx_leituras_usuario_data (
        usuario_id,
        lida_em
    ),

    CONSTRAINT fk_leituras_mensagem
        FOREIGN KEY (
            mensagem_id
        )
        REFERENCES mensagens (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_leituras_usuario
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
-- FIM DA MIGRATION 008
-- ============================================================
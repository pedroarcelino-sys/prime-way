-- ============================================================
-- PRIMEWAY SCHOOL
-- MIGRATION 002 - PESSOAS / PERFIS / IDENTIDADE
-- ============================================================
--
-- Dependência:
--   database/primeway.sql
--
-- Esta migration:
--   - cria a estrutura central de pessoas;
--   - cria Alunos, Professores, Responsáveis e Funcionários;
--   - cria Setores;
--   - cria o vínculo Aluno x Responsável;
--   - evolui a tabela usuarios existente;
--   - adiciona o perfil Secretaria;
--   - preserva a conta Admin já existente.
--
-- IMPORTANTE:
--   Esta migration deve ser executada UMA VEZ.
-- ============================================================


USE primeway_school;


-- ============================================================
-- 1. PESSOAS
-- ============================================================
--
-- Representa a pessoa física independentemente do papel que
-- ela exerce no sistema.
--
-- O e-mail aqui é o e-mail pessoal/de contato.
-- NÃO é necessariamente o e-mail utilizado para login.
--
-- O login continuará armazenado em usuarios.email.
-- ============================================================

CREATE TABLE pessoas (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    nome VARCHAR(120) NOT NULL,

    email_contato VARCHAR(190) NULL,

    telefone VARCHAR(30) NULL,

    documento VARCHAR(30) NULL,

    data_nascimento DATE NULL,

    ativo TINYINT(1) NOT NULL DEFAULT 1,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_pessoas_documento (
        documento
    ),

    KEY idx_pessoas_nome (
        nome
    ),

    KEY idx_pessoas_email_contato (
        email_contato
    ),

    KEY idx_pessoas_ativo (
        ativo
    )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. SETORES
-- ============================================================
--
-- Permite representar os setores internos da escola.
--
-- Exemplos atuais do projeto:
--   Secretaria
--   Coordenação
--   Direção
--   Orientação
-- ============================================================

CREATE TABLE setores (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    nome VARCHAR(100) NOT NULL,

    descricao VARCHAR(255) NULL,

    ativo TINYINT(1) NOT NULL DEFAULT 1,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_setores_nome (
        nome
    ),

    KEY idx_setores_ativo (
        ativo
    )

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. ALUNOS
-- ============================================================
--
-- Dados específicos do papel acadêmico de Aluno.
--
-- NÃO armazenamos aqui:
--   turma
--   média
--   frequência
--
-- A turma será definida por matriculas.
-- Média e frequência serão obtidas dos registros acadêmicos
-- que criaremos nas próximas migrations.
-- ============================================================

CREATE TABLE alunos (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    pessoa_id BIGINT UNSIGNED NOT NULL,

    matricula VARCHAR(50) NOT NULL,

    status ENUM(
        'ativo',
        'pendente',
        'inativo'
    ) NOT NULL DEFAULT 'ativo',

    novo_aluno TINYINT(1) NOT NULL DEFAULT 1,

    ingresso_em DATE NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_alunos_pessoa (
        pessoa_id
    ),

    UNIQUE KEY uq_alunos_matricula (
        matricula
    ),

    KEY idx_alunos_status (
        status
    ),

    CONSTRAINT fk_alunos_pessoa
        FOREIGN KEY (pessoa_id)
        REFERENCES pessoas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. PROFESSORES
-- ============================================================
--
-- Dados específicos de professores.
--
-- O relacionamento Professor x Turma x Disciplina será criado
-- pelo seu amigo em 003_academico.sql.
-- ============================================================

CREATE TABLE professores (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    pessoa_id BIGINT UNSIGNED NOT NULL,

    registro_funcional VARCHAR(50) NULL,

    status ENUM(
        'ativo',
        'inativo'
    ) NOT NULL DEFAULT 'ativo',

    admissao_em DATE NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_professores_pessoa (
        pessoa_id
    ),

    UNIQUE KEY uq_professores_registro (
        registro_funcional
    ),

    KEY idx_professores_status (
        status
    ),

    CONSTRAINT fk_professores_pessoa
        FOREIGN KEY (pessoa_id)
        REFERENCES pessoas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. RESPONSÁVEIS
-- ============================================================
--
-- O parentesco NÃO fica nesta tabela.
--
-- Isso acontece porque um responsável pode estar relacionado
-- a vários alunos e o relacionamento pode ser diferente para
-- cada aluno.
--
-- O vínculo será armazenado em aluno_responsavel.
-- ============================================================

CREATE TABLE responsaveis (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    pessoa_id BIGINT UNSIGNED NOT NULL,

    status ENUM(
        'ativo',
        'pendente',
        'inativo'
    ) NOT NULL DEFAULT 'ativo',

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_responsaveis_pessoa (
        pessoa_id
    ),

    KEY idx_responsaveis_status (
        status
    ),

    CONSTRAINT fk_responsaveis_pessoa
        FOREIGN KEY (pessoa_id)
        REFERENCES pessoas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 6. FUNCIONÁRIOS
-- ============================================================
--
-- Funcionários internos da escola.
--
-- A Secretaria será representada por:
--
--   pessoas
--      ↓
--   funcionarios
--      ↓
--   setores
--
-- Dessa forma futuramente também poderemos ter Direção,
-- Coordenação, Orientação etc. sem criar novas tabelas.
-- ============================================================

CREATE TABLE funcionarios (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    pessoa_id BIGINT UNSIGNED NOT NULL,

    setor_id BIGINT UNSIGNED NOT NULL,

    registro_funcional VARCHAR(50) NULL,

    cargo VARCHAR(100) NULL,

    status ENUM(
        'ativo',
        'inativo'
    ) NOT NULL DEFAULT 'ativo',

    admissao_em DATE NULL,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_funcionarios_pessoa (
        pessoa_id
    ),

    UNIQUE KEY uq_funcionarios_registro (
        registro_funcional
    ),

    KEY idx_funcionarios_setor (
        setor_id
    ),

    KEY idx_funcionarios_status (
        status
    ),

    CONSTRAINT fk_funcionarios_pessoa
        FOREIGN KEY (pessoa_id)
        REFERENCES pessoas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_funcionarios_setor
        FOREIGN KEY (setor_id)
        REFERENCES setores (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 7. ALUNO X RESPONSÁVEL
-- ============================================================
--
-- Relacionamento N:N.
--
-- Um aluno pode possuir vários responsáveis.
-- Um responsável pode possuir vários alunos.
--
-- O projeto atual já possui:
--   parentesco;
--   autorização de retirada.
--
-- Também deixamos preparados:
--   contato principal;
--   responsável financeiro.
-- ============================================================

CREATE TABLE aluno_responsavel (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    aluno_id BIGINT UNSIGNED NOT NULL,

    responsavel_id BIGINT UNSIGNED NOT NULL,

    parentesco VARCHAR(50) NOT NULL,

    autorizado_retirada TINYINT(1)
        NOT NULL DEFAULT 0,

    contato_principal TINYINT(1)
        NOT NULL DEFAULT 0,

    responsavel_financeiro TINYINT(1)
        NOT NULL DEFAULT 0,

    ativo TINYINT(1)
        NOT NULL DEFAULT 1,

    criado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_aluno_responsavel (
        aluno_id,
        responsavel_id
    ),

    KEY idx_aluno_responsavel_aluno (
        aluno_id
    ),

    KEY idx_aluno_responsavel_responsavel (
        responsavel_id
    ),

    KEY idx_aluno_responsavel_ativo (
        ativo
    ),

    CONSTRAINT fk_aluno_responsavel_aluno
        FOREIGN KEY (aluno_id)
        REFERENCES alunos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_aluno_responsavel_responsavel
        FOREIGN KEY (responsavel_id)
        REFERENCES responsaveis (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 8. SETORES INICIAIS
-- ============================================================

INSERT INTO setores (
    nome,
    descricao,
    ativo
)
VALUES

(
    'Secretaria',
    'Secretaria escolar',
    1
),

(
    'Coordenação',
    'Equipe de coordenação pedagógica',
    1
),

(
    'Direção',
    'Gestão e direção escolar',
    1
),

(
    'Orientação',
    'Orientação educacional',
    1
)

ON DUPLICATE KEY UPDATE

    descricao =
        VALUES(descricao),

    ativo =
        VALUES(ativo);


-- ============================================================
-- 9. EVOLUÇÃO DA TABELA USUARIOS
-- ============================================================
--
-- A tabela usuarios JÁ EXISTE.
--
-- Não apagamos nem recriamos a tabela porque o login atual
-- e a conta Admin devem continuar funcionando.
--
-- pessoa_id é NULL porque o Admin de desenvolvimento atual
-- ainda não possui um registro correspondente em pessoas.
--
-- As contas que futuramente forem criadas automaticamente
-- para:
--
--   Aluno
--   Professor
--   Responsável
--   Secretaria
--
-- deverão possuir pessoa_id.
--
-- usuarios.email continuará sendo o E-MAIL DE ACESSO.
--
-- pessoas.email_contato será o endereço utilizado para
-- enviar as credenciais à pessoa.
-- ============================================================

ALTER TABLE usuarios

    ADD COLUMN pessoa_id BIGINT UNSIGNED NULL
        AFTER id,

    MODIFY COLUMN perfil ENUM(
        'admin',
        'professor',
        'responsavel',
        'aluno',
        'secretaria'
    ) NOT NULL,

    ADD COLUMN credenciais_enviadas_em DATETIME NULL
        AFTER ultimo_login,

    ADD UNIQUE KEY uq_usuarios_pessoa (
        pessoa_id
    ),

    ADD CONSTRAINT fk_usuarios_pessoa
        FOREIGN KEY (pessoa_id)
        REFERENCES pessoas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;


-- ============================================================
-- FIM DA MIGRATION 002
-- ============================================================
-- ============================================================
-- PRIMEWAY SCHOOL
-- BANCO DE DADOS COMPLETO - INSTALAÇÃO LIMPA
-- ============================================================
--
-- Este arquivo cria o banco primeway_school do zero.
--
-- IMPORTANTE:
--   - use este arquivo em uma instalação limpa;
--   - não execute por cima do banco atual construído pelas migrations;
--   - senhas em texto puro nunca são armazenadas no banco;
--   - o Admin abaixo é apenas de desenvolvimento e deve ter sua
--     credencial alterada antes de qualquer publicação real.
-- ============================================================

CREATE DATABASE IF NOT EXISTS primeway_school
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE primeway_school;


-- ============================================================
-- 1. IDENTIDADE / PESSOAS
-- ============================================================

CREATE TABLE pessoas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(120) NOT NULL,
    email_contato VARCHAR(190) NULL,
    telefone VARCHAR(30) NULL,
    documento VARCHAR(30) NULL,
    data_nascimento DATE NULL,
    ativo TINYINT UNSIGNED NOT NULL DEFAULT 1,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_pessoas_documento (documento),
    KEY idx_pessoas_nome (nome),
    KEY idx_pessoas_email_contato (email_contato),
    KEY idx_pessoas_ativo (ativo),

    CONSTRAINT chk_pessoas_ativo
        CHECK (ativo IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE setores (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NULL,
    ativo TINYINT UNSIGNED NOT NULL DEFAULT 1,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_setores_nome (nome),
    KEY idx_setores_ativo (ativo),

    CONSTRAINT chk_setores_ativo
        CHECK (ativo IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE alunos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pessoa_id BIGINT UNSIGNED NOT NULL,
    matricula VARCHAR(50) NOT NULL,
    status ENUM(
        'ativo',
        'pendente',
        'inativo'
    ) NOT NULL DEFAULT 'ativo',
    novo_aluno TINYINT UNSIGNED NOT NULL DEFAULT 1,
    ingresso_em DATE NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_alunos_pessoa (pessoa_id),
    UNIQUE KEY uq_alunos_matricula (matricula),
    KEY idx_alunos_status (status),

    CONSTRAINT fk_alunos_pessoa
        FOREIGN KEY (pessoa_id)
        REFERENCES pessoas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_alunos_novo
        CHECK (novo_aluno IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE professores (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pessoa_id BIGINT UNSIGNED NOT NULL,
    registro_funcional VARCHAR(50) NULL,
    status ENUM(
        'ativo',
        'inativo'
    ) NOT NULL DEFAULT 'ativo',
    admissao_em DATE NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_professores_pessoa (pessoa_id),
    UNIQUE KEY uq_professores_registro (registro_funcional),
    KEY idx_professores_status (status),

    CONSTRAINT fk_professores_pessoa
        FOREIGN KEY (pessoa_id)
        REFERENCES pessoas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE responsaveis (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pessoa_id BIGINT UNSIGNED NOT NULL,
    status ENUM(
        'ativo',
        'pendente',
        'inativo'
    ) NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_responsaveis_pessoa (pessoa_id),
    KEY idx_responsaveis_status (status),

    CONSTRAINT fk_responsaveis_pessoa
        FOREIGN KEY (pessoa_id)
        REFERENCES pessoas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


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
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_funcionarios_pessoa (pessoa_id),
    UNIQUE KEY uq_funcionarios_registro (registro_funcional),
    KEY idx_funcionarios_setor (setor_id),
    KEY idx_funcionarios_status (status),

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


CREATE TABLE aluno_responsavel (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    aluno_id BIGINT UNSIGNED NOT NULL,
    responsavel_id BIGINT UNSIGNED NOT NULL,
    parentesco VARCHAR(50) NOT NULL,
    autorizado_retirada TINYINT UNSIGNED NOT NULL DEFAULT 0,
    contato_principal TINYINT UNSIGNED NOT NULL DEFAULT 0,
    responsavel_financeiro TINYINT UNSIGNED NOT NULL DEFAULT 0,
    ativo TINYINT UNSIGNED NOT NULL DEFAULT 1,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_aluno_responsavel (aluno_id, responsavel_id),
    KEY idx_aluno_responsavel_responsavel (responsavel_id),
    KEY idx_aluno_responsavel_ativo (ativo),

    CONSTRAINT fk_aluno_responsavel_aluno
        FOREIGN KEY (aluno_id)
        REFERENCES alunos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_aluno_responsavel_responsavel
        FOREIGN KEY (responsavel_id)
        REFERENCES responsaveis (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_aluno_responsavel_retirada
        CHECK (autorizado_retirada IN (0, 1)),

    CONSTRAINT chk_aluno_responsavel_principal
        CHECK (contato_principal IN (0, 1)),

    CONSTRAINT chk_aluno_responsavel_financeiro
        CHECK (responsavel_financeiro IN (0, 1)),

    CONSTRAINT chk_aluno_responsavel_ativo
        CHECK (ativo IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE usuarios (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pessoa_id BIGINT UNSIGNED NULL,
    nome VARCHAR(120) NULL,
    email VARCHAR(190) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil ENUM(
        'admin',
        'professor',
        'responsavel',
        'aluno',
        'secretaria'
    ) NOT NULL,
    ativo TINYINT UNSIGNED NOT NULL DEFAULT 1,
    ultimo_login DATETIME NULL,
    credenciais_enviadas_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_email (email),
    UNIQUE KEY uq_usuarios_pessoa (pessoa_id),
    KEY idx_usuarios_perfil_ativo (perfil, ativo),

    CONSTRAINT fk_usuarios_pessoa
        FOREIGN KEY (pessoa_id)
        REFERENCES pessoas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_usuarios_ativo
        CHECK (ativo IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. ESTRUTURA ACADÊMICA
-- ============================================================

CREATE TABLE anos_letivos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ano YEAR NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    ativo TINYINT UNSIGNED NOT NULL DEFAULT 1,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_anos_letivos_ano (ano),
    KEY idx_anos_letivos_ativo (ativo),

    CONSTRAINT chk_anos_letivos_datas
        CHECK (data_fim >= data_inicio),

    CONSTRAINT chk_anos_letivos_ativo
        CHECK (ativo IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE periodos_letivos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ano_letivo_id BIGINT UNSIGNED NOT NULL,
    nome VARCHAR(40) NOT NULL,
    ordem TINYINT UNSIGNED NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_periodos_ano_ordem (ano_letivo_id, ordem),
    UNIQUE KEY uq_periodos_ano_nome (ano_letivo_id, nome),

    CONSTRAINT fk_periodos_ano_letivo
        FOREIGN KEY (ano_letivo_id)
        REFERENCES anos_letivos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_periodos_ordem
        CHECK (ordem > 0),

    CONSTRAINT chk_periodos_datas
        CHECK (data_fim >= data_inicio)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE turmas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ano_letivo_id BIGINT UNSIGNED NOT NULL,
    professor_id BIGINT UNSIGNED NULL,
    nome VARCHAR(50) NOT NULL,
    serie VARCHAR(30) NOT NULL,
    turno ENUM(
        'Manhã',
        'Tarde',
        'Integral'
    ) NOT NULL,
    sala VARCHAR(30) NULL,
    capacidade SMALLINT UNSIGNED NOT NULL DEFAULT 30,
    status ENUM(
        'Ativa',
        'Inativa'
    ) NOT NULL DEFAULT 'Ativa',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_turmas_ano_nome (ano_letivo_id, nome),
    KEY idx_turmas_professor (professor_id),
    KEY idx_turmas_turno (turno),
    KEY idx_turmas_status (status),

    CONSTRAINT fk_turmas_ano_letivo
        FOREIGN KEY (ano_letivo_id)
        REFERENCES anos_letivos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_turmas_professor
        FOREIGN KEY (professor_id)
        REFERENCES professores (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_turmas_capacidade
        CHECK (capacidade > 0)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE disciplinas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    area VARCHAR(60) NOT NULL,
    status ENUM(
        'Ativa',
        'Inativa'
    ) NOT NULL DEFAULT 'Ativa',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_disciplinas_codigo (codigo),
    KEY idx_disciplinas_nome (nome),
    KEY idx_disciplinas_area (area),
    KEY idx_disciplinas_status (status)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE matriculas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    aluno_id BIGINT UNSIGNED NOT NULL,
    turma_id BIGINT UNSIGNED NOT NULL,
    numero_chamada SMALLINT UNSIGNED NULL,
    data_matricula DATE NOT NULL,
    situacao ENUM(
        'Ativa',
        'Transferida',
        'Concluída',
        'Cancelada'
    ) NOT NULL DEFAULT 'Ativa',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_matriculas_aluno_turma (aluno_id, turma_id),
    UNIQUE KEY uq_matriculas_turma_chamada (turma_id, numero_chamada),
    KEY idx_matriculas_situacao (situacao),

    CONSTRAINT fk_matriculas_aluno
        FOREIGN KEY (aluno_id)
        REFERENCES alunos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_matriculas_turma
        FOREIGN KEY (turma_id)
        REFERENCES turmas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE turma_disciplinas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turma_id BIGINT UNSIGNED NOT NULL,
    disciplina_id BIGINT UNSIGNED NOT NULL,
    professor_id BIGINT UNSIGNED NOT NULL,
    carga_horaria SMALLINT UNSIGNED NOT NULL,
    status ENUM(
        'Ativa',
        'Inativa'
    ) NOT NULL DEFAULT 'Ativa',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_turma_disciplinas (turma_id, disciplina_id),
    KEY idx_turma_disciplinas_disciplina (disciplina_id),
    KEY idx_turma_disciplinas_professor (professor_id),
    KEY idx_turma_disciplinas_status (status),

    CONSTRAINT fk_turma_disciplinas_turma
        FOREIGN KEY (turma_id)
        REFERENCES turmas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_turma_disciplinas_disciplina
        FOREIGN KEY (disciplina_id)
        REFERENCES disciplinas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_turma_disciplinas_professor
        FOREIGN KEY (professor_id)
        REFERENCES professores (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_turma_disciplinas_carga
        CHECK (carga_horaria > 0)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. DESEMPENHO ACADÊMICO
-- ============================================================

CREATE TABLE atividades (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turma_disciplina_id BIGINT UNSIGNED NOT NULL,
    periodo_letivo_id BIGINT UNSIGNED NOT NULL,
    titulo VARCHAR(190) NOT NULL,
    descricao TEXT NULL,
    data_publicacao DATETIME NULL,
    data_entrega DATETIME NULL,
    status ENUM(
        'Rascunho',
        'Publicada',
        'Encerrada',
        'Cancelada'
    ) NOT NULL DEFAULT 'Rascunho',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_atividades_turma_disciplina (turma_disciplina_id),
    KEY idx_atividades_periodo (periodo_letivo_id),
    KEY idx_atividades_status (status),
    KEY idx_atividades_entrega (data_entrega),

    CONSTRAINT fk_atividades_turma_disciplina
        FOREIGN KEY (turma_disciplina_id)
        REFERENCES turma_disciplinas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_atividades_periodo
        FOREIGN KEY (periodo_letivo_id)
        REFERENCES periodos_letivos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_atividades_datas
        CHECK (
            data_entrega IS NULL
            OR data_publicacao IS NULL
            OR data_entrega >= data_publicacao
        )
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE entregas_atividades (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    atividade_id BIGINT UNSIGNED NOT NULL,
    matricula_id BIGINT UNSIGNED NOT NULL,
    conteudo TEXT NULL,
    status ENUM(
        'Pendente',
        'Entregue',
        'Atrasada',
        'Corrigida',
        'Cancelada'
    ) NOT NULL DEFAULT 'Pendente',
    entregue_em DATETIME NULL,
    corrigida_em DATETIME NULL,
    feedback TEXT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_entregas_atividade_matricula (
        atividade_id,
        matricula_id
    ),
    KEY idx_entregas_matricula (matricula_id),
    KEY idx_entregas_status (status),
    KEY idx_entregas_data (entregue_em),

    CONSTRAINT fk_entregas_atividade
        FOREIGN KEY (atividade_id)
        REFERENCES atividades (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_entregas_matricula
        FOREIGN KEY (matricula_id)
        REFERENCES matriculas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE avaliacoes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turma_disciplina_id BIGINT UNSIGNED NOT NULL,
    periodo_letivo_id BIGINT UNSIGNED NOT NULL,
    atividade_id BIGINT UNSIGNED NULL,
    titulo VARCHAR(190) NOT NULL,
    descricao TEXT NULL,
    tipo ENUM(
        'Prova',
        'Trabalho',
        'Atividade',
        'Projeto',
        'Recuperação',
        'Outro'
    ) NOT NULL,
    valor_maximo DECIMAL(6,2) NOT NULL,
    peso DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    data_avaliacao DATE NULL,
    status ENUM(
        'Planejada',
        'Aplicada',
        'Finalizada',
        'Cancelada'
    ) NOT NULL DEFAULT 'Planejada',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_avaliacoes_turma_disciplina (turma_disciplina_id),
    KEY idx_avaliacoes_periodo (periodo_letivo_id),
    KEY idx_avaliacoes_atividade (atividade_id),
    KEY idx_avaliacoes_data (data_avaliacao),
    KEY idx_avaliacoes_status (status),

    CONSTRAINT fk_avaliacoes_turma_disciplina
        FOREIGN KEY (turma_disciplina_id)
        REFERENCES turma_disciplinas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_avaliacoes_periodo
        FOREIGN KEY (periodo_letivo_id)
        REFERENCES periodos_letivos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_avaliacoes_atividade
        FOREIGN KEY (atividade_id)
        REFERENCES atividades (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_avaliacoes_valor
        CHECK (valor_maximo > 0),

    CONSTRAINT chk_avaliacoes_peso
        CHECK (peso > 0)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE notas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    avaliacao_id BIGINT UNSIGNED NOT NULL,
    matricula_id BIGINT UNSIGNED NOT NULL,
    valor DECIMAL(6,2) NOT NULL,
    observacao TEXT NULL,
    lancada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_notas_avaliacao_matricula (
        avaliacao_id,
        matricula_id
    ),
    KEY idx_notas_matricula (matricula_id),

    CONSTRAINT fk_notas_avaliacao
        FOREIGN KEY (avaliacao_id)
        REFERENCES avaliacoes (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_notas_matricula
        FOREIGN KEY (matricula_id)
        REFERENCES matriculas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_notas_valor
        CHECK (valor >= 0)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE aulas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turma_disciplina_id BIGINT UNSIGNED NOT NULL,
    periodo_letivo_id BIGINT UNSIGNED NOT NULL,
    data_aula DATE NOT NULL,
    horario_inicio TIME NULL,
    horario_fim TIME NULL,
    conteudo TEXT NULL,
    observacoes TEXT NULL,
    status ENUM(
        'Planejada',
        'Realizada',
        'Cancelada'
    ) NOT NULL DEFAULT 'Planejada',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_aulas_turma_disciplina (turma_disciplina_id),
    KEY idx_aulas_periodo (periodo_letivo_id),
    KEY idx_aulas_data (data_aula),
    KEY idx_aulas_status (status),

    CONSTRAINT fk_aulas_turma_disciplina
        FOREIGN KEY (turma_disciplina_id)
        REFERENCES turma_disciplinas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_aulas_periodo
        FOREIGN KEY (periodo_letivo_id)
        REFERENCES periodos_letivos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_aulas_horario
        CHECK (
            horario_inicio IS NULL
            OR horario_fim IS NULL
            OR horario_fim > horario_inicio
        )
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE frequencias (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    aula_id BIGINT UNSIGNED NOT NULL,
    matricula_id BIGINT UNSIGNED NOT NULL,
    situacao ENUM(
        'Presente',
        'Falta',
        'Justificada',
        'Atraso'
    ) NOT NULL DEFAULT 'Presente',
    observacao VARCHAR(500) NULL,
    registrado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_frequencias_aula_matricula (
        aula_id,
        matricula_id
    ),
    KEY idx_frequencias_matricula (matricula_id),
    KEY idx_frequencias_situacao (situacao),

    CONSTRAINT fk_frequencias_aula
        FOREIGN KEY (aula_id)
        REFERENCES aulas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_frequencias_matricula
        FOREIGN KEY (matricula_id)
        REFERENCES matriculas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. CALENDÁRIO
-- ============================================================

CREATE TABLE eventos_calendario (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turma_id BIGINT UNSIGNED NULL,
    criado_por_usuario_id BIGINT UNSIGNED NULL,
    titulo VARCHAR(190) NOT NULL,
    tipo VARCHAR(60) NOT NULL,
    data_evento DATE NOT NULL,
    horario_inicio TIME NULL,
    horario_fim TIME NULL,
    local VARCHAR(190) NULL,
    descricao TEXT NULL,
    status ENUM(
        'Agendado',
        'Concluído',
        'Cancelado'
    ) NOT NULL DEFAULT 'Agendado',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_eventos_criador (criado_por_usuario_id),
    KEY idx_eventos_data (data_evento),
    KEY idx_eventos_tipo (tipo),
    KEY idx_eventos_status (status),
    KEY idx_eventos_turma_data (turma_id, data_evento),

    CONSTRAINT fk_eventos_turma
        FOREIGN KEY (turma_id)
        REFERENCES turmas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_eventos_criador
        FOREIGN KEY (criado_por_usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_eventos_horario
        CHECK (
            horario_inicio IS NULL
            OR horario_fim IS NULL
            OR horario_fim > horario_inicio
        )
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. NOTIFICAÇÕES
-- ============================================================

CREATE TABLE notificacoes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    criado_por_usuario_id BIGINT UNSIGNED NULL,
    evento_calendario_id BIGINT UNSIGNED NULL,
    titulo VARCHAR(190) NOT NULL,
    tipo VARCHAR(60) NOT NULL,
    publico VARCHAR(60) NOT NULL,
    mensagem TEXT NOT NULL,
    origem VARCHAR(40) NOT NULL DEFAULT 'Manual',
    status ENUM(
        'Rascunho',
        'Agendada',
        'Publicada',
        'Cancelada'
    ) NOT NULL DEFAULT 'Rascunho',
    agendada_para DATETIME NULL,
    publicada_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_notificacoes_criador (criado_por_usuario_id),
    KEY idx_notificacoes_evento (evento_calendario_id),
    KEY idx_notificacoes_tipo (tipo),
    KEY idx_notificacoes_publico (publico),
    KEY idx_notificacoes_origem (origem),
    KEY idx_notificacoes_status (status),
    KEY idx_notificacoes_agendada (agendada_para),
    KEY idx_notificacoes_publicada (publicada_em),

    CONSTRAINT fk_notificacoes_criador
        FOREIGN KEY (criado_por_usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_notificacoes_evento
        FOREIGN KEY (evento_calendario_id)
        REFERENCES eventos_calendario (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE notificacao_destinatarios (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    notificacao_id BIGINT UNSIGNED NOT NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    recebida_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lida_em DATETIME NULL,
    excluida_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_notificacao_destinatario (
        notificacao_id,
        usuario_id
    ),
    KEY idx_destinatarios_caixa_entrada (
        usuario_id,
        excluida_em,
        lida_em,
        recebida_em
    ),

    CONSTRAINT fk_destinatarios_notificacao
        FOREIGN KEY (notificacao_id)
        REFERENCES notificacoes (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_destinatarios_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 6. CONFIGURAÇÕES
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
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_configuracoes_grupo_chave (
        grupo,
        chave
    ),
    KEY idx_configuracoes_chave (chave),
    KEY idx_configuracoes_usuario (
        atualizado_por_usuario_id
    ),

    CONSTRAINT fk_configuracoes_usuario
        FOREIGN KEY (atualizado_por_usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_configuracoes_editavel
        CHECK (editavel IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 7. CHAT
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
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_conversas_criador (
        criada_por_usuario_id
    ),
    KEY idx_conversas_ativo_tipo (
        ativo,
        tipo
    ),

    CONSTRAINT fk_conversas_criador
        FOREIGN KEY (criada_por_usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_conversas_ativo
        CHECK (ativo IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE conversa_participantes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    conversa_id BIGINT UNSIGNED NOT NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    ativo TINYINT UNSIGNED NOT NULL DEFAULT 1,
    entrou_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    saiu_em DATETIME NULL,
    arquivada_em DATETIME NULL,
    ultima_visualizacao_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_conversa_participante (
        conversa_id,
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
        FOREIGN KEY (conversa_id)
        REFERENCES conversas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_participantes_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_participantes_ativo
        CHECK (ativo IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


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
    enviada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    editada_em DATETIME NULL,
    excluida_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_mensagens_id_conversa (
        id,
        conversa_id
    ),

    KEY idx_mensagens_conversa_data (
        conversa_id,
        enviada_em,
        id
    ),

    KEY idx_mensagens_conversa_remetente (
        conversa_id,
        remetente_usuario_id
    ),

    KEY idx_mensagens_remetente (
        remetente_usuario_id
    ),

    KEY idx_mensagens_resposta_conversa (
        respondendo_mensagem_id,
        conversa_id
    ),

    KEY idx_mensagens_excluida (
        excluida_em
    ),

    CONSTRAINT fk_mensagens_conversa
        FOREIGN KEY (conversa_id)
        REFERENCES conversas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

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

    CONSTRAINT fk_mensagens_resposta_mesma_conversa
        FOREIGN KEY (
            respondendo_mensagem_id,
            conversa_id
        )
        REFERENCES mensagens (
            id,
            conversa_id
        )
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE mensagem_anexos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    mensagem_id BIGINT UNSIGNED NOT NULL,
    nome_original VARCHAR(255) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    mime_type VARCHAR(150) NULL,
    tamanho_bytes BIGINT UNSIGNED NULL,
    caminho VARCHAR(500) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_anexos_mensagem (mensagem_id),

    CONSTRAINT fk_anexos_mensagem
        FOREIGN KEY (mensagem_id)
        REFERENCES mensagens (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE mensagem_leituras (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    mensagem_id BIGINT UNSIGNED NOT NULL,
    conversa_id BIGINT UNSIGNED NOT NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    lida_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_mensagem_leitura (
        mensagem_id,
        usuario_id
    ),

    KEY idx_leituras_mensagem_conversa (
        mensagem_id,
        conversa_id
    ),

    KEY idx_leituras_conversa_usuario (
        conversa_id,
        usuario_id
    ),

    KEY idx_leituras_usuario_data (
        usuario_id,
        lida_em
    ),

    CONSTRAINT fk_leituras_mensagem_conversa
        FOREIGN KEY (
            mensagem_id,
            conversa_id
        )
        REFERENCES mensagens (
            id,
            conversa_id
        )
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_leituras_participante
        FOREIGN KEY (
            conversa_id,
            usuario_id
        )
        REFERENCES conversa_participantes (
            conversa_id,
            usuario_id
        )
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 8. AUDITORIA
-- ============================================================

CREATE TABLE auditoria (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT UNSIGNED NULL,
    acao VARCHAR(60) NOT NULL,
    entidade VARCHAR(100) NULL,
    registro_id BIGINT UNSIGNED NULL,
    descricao VARCHAR(500) NULL,
    dados_anteriores JSON NULL,
    dados_novos JSON NULL,
    endereco_ip VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_auditoria_acao (
        acao
    ),

    KEY idx_auditoria_entidade_registro (
        entidade,
        registro_id
    ),

    KEY idx_auditoria_criado_em (
        criado_em
    ),

    KEY idx_auditoria_usuario_data (
        usuario_id,
        criado_em
    ),

    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 9. ESTADO COMPARTILHADO DA INTERFACE
-- ============================================================

CREATE TABLE estado_aplicacao (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    chave VARCHAR(80) NOT NULL,
    escopo VARCHAR(80) NOT NULL DEFAULT 'global',
    usuario_id BIGINT UNSIGNED NULL,
    valor_json JSON NOT NULL,
    atualizado_por_usuario_id BIGINT UNSIGNED NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_estado_chave_escopo (
        chave,
        escopo
    ),

    KEY idx_estado_usuario (usuario_id),
    KEY idx_estado_atualizado_por (atualizado_por_usuario_id),

    CONSTRAINT fk_estado_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_estado_atualizado_por
        FOREIGN KEY (atualizado_por_usuario_id)
        REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 10. CONTROLE DE MIGRATIONS
-- ============================================================

CREATE TABLE schema_migrations (
    versao VARCHAR(255) NOT NULL,
    checksum CHAR(64) NOT NULL,
    aplicado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (versao)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (
    versao,
    checksum
)
VALUES
    ('002_pessoas.sql', 'baseline'),
    ('003_academico.sql', 'baseline'),
    ('004_desempenho_academico.sql', 'baseline'),
    ('005_calendario.sql', 'baseline'),
    ('006_notificacoes.sql', 'baseline'),
    ('007_configuracoes.sql', 'baseline'),
    ('008_chat.sql', 'baseline'),
    ('009_auditoria.sql', 'baseline'),
    ('010_estado_aplicacao.sql', 'baseline');


-- ============================================================
-- 11. DADOS INICIAIS
-- ============================================================


-- ============================================================
-- SETORES
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
    );


-- ============================================================
-- ANO LETIVO
-- ============================================================

INSERT INTO anos_letivos (
    ano,
    data_inicio,
    data_fim,
    ativo
)
VALUES (
    2026,
    '2026-02-02',
    '2026-12-18',
    1
);

SET @ano_letivo_2026_id = LAST_INSERT_ID();


-- ============================================================
-- PERÍODOS LETIVOS
-- ============================================================

INSERT INTO periodos_letivos (
    ano_letivo_id,
    nome,
    ordem,
    data_inicio,
    data_fim
)
VALUES
    (
        @ano_letivo_2026_id,
        '1º Bimestre',
        1,
        '2026-02-02',
        '2026-04-17'
    ),
    (
        @ano_letivo_2026_id,
        '2º Bimestre',
        2,
        '2026-04-22',
        '2026-06-30'
    ),
    (
        @ano_letivo_2026_id,
        '3º Bimestre',
        3,
        '2026-07-20',
        '2026-09-30'
    ),
    (
        @ano_letivo_2026_id,
        '4º Bimestre',
        4,
        '2026-10-05',
        '2026-12-18'
    );


-- ============================================================
-- DISCIPLINAS
-- ============================================================

INSERT INTO disciplinas (
    codigo,
    nome,
    area,
    status
)
VALUES
    (
        'MAT01',
        'Matemática',
        'Matemática',
        'Ativa'
    ),
    (
        'POR01',
        'Língua Portuguesa',
        'Linguagens',
        'Ativa'
    ),
    (
        'CIE01',
        'Ciências',
        'Ciências da Natureza',
        'Ativa'
    ),
    (
        'HIS01',
        'História',
        'Ciências Humanas',
        'Ativa'
    ),
    (
        'ART01',
        'Arte',
        'Artes',
        'Ativa'
    );


-- ============================================================
-- CONFIGURAÇÕES
-- ============================================================

INSERT INTO configuracoes_sistema (
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
    ),

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
    ),

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
    ),

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
-- ADMIN DE DESENVOLVIMENTO
-- ============================================================
--
-- E-mail: admin@primeway.com
--
-- A credencial atual é somente de desenvolvimento.
-- Troque-a antes de qualquer publicação real.
--
-- ============================================================

INSERT INTO usuarios (
    pessoa_id,
    nome,
    email,
    senha_hash,
    perfil,
    ativo,
    ultimo_login,
    credenciais_enviadas_em
)
VALUES (
    NULL,
    NULL,
    'admin@primeway.com',
    '$2y$12$GRUdH8nSkc4NCy3K/tN1Wux6TwQeZApNApdv/.Y5qwieJs12X2qx2',
    'admin',
    1,
    NULL,
    NULL
);


-- ============================================================
-- FIM DO PRIMEWAY SCHOOL
-- ============================================================

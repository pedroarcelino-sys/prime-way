<?php

declare(strict_types=1);

/*====================================================
        SALVAR ALUNO - PRIMEWAY SCHOOL
        POST /api/alunos/salvar.php
====================================================*/

require_once
    __DIR__ .
    '/../_bootstrap.php';


/*====================================================
                    REQUISIÇÃO
====================================================*/

primewayExigirMetodo(
    'POST'
);

$usuario =
    primewayExigirPerfis([
        'admin'
    ]);

primewayExigirCsrf();

$dados =
    primewayLerJson();


/*====================================================
                FUNÇÕES AUXILIARES
====================================================*/

function primewayAlunoTexto(
    mixed $valor
): string {

    return is_string(
        $valor
    )
        ? trim(
            $valor
        )
        : '';
}


function primewayAlunoFalha(
    string $mensagem,
    int $status = 400
): never {

    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                $mensagem
        ],
        $status
    );
}


/*====================================================
                    CAMPOS
====================================================*/

$idInformado =
    $dados[
        'id'
    ] ??
    null;

$id =
    primewayIdPositivo(
        $idInformado
    );


if (
    $idInformado !== null &&
    $idInformado !== '' &&
    $id === null
) {

    primewayAlunoFalha(
        'Identificador do aluno inválido.'
    );
}


$nome =
    primewayAlunoTexto(
        $dados[
            'name'
        ] ??
        ''
    );

$matricula =
    primewayAlunoTexto(
        $dados[
            'registration'
        ] ??
        ''
    );

$email =
    mb_strtolower(
        primewayAlunoTexto(
            $dados['email'] ?? ''
        )
    );

$senha =
    is_string($dados['password'] ?? null)
        ? (string) $dados['password']
        : '';

$telefone =
    primewayAlunoTexto($dados['phone'] ?? '');

$documento =
    primewayAlunoTexto($dados['document'] ?? '');

$nascimento =
    primewayAlunoTexto($dados['birthDate'] ?? '');

$statusRecebido =
    strtolower(
        primewayAlunoTexto(
            $dados[
                'status'
            ] ??
            ''
        )
    );

$turmaIdInformado =
    $dados[
        'classId'
    ] ??
    null;

$turmaId =
    primewayIdPositivo(
        $turmaIdInformado
    );


if (
    $turmaIdInformado !== null &&
    $turmaIdInformado !== '' &&
    $turmaId === null
) {

    primewayAlunoFalha(
        'Identificador da turma inválido.'
    );
}


/*====================================================
                    VALIDAÇÃO
====================================================*/

if (
    $nome === ''
) {

    primewayAlunoFalha(
        'Informe o nome do aluno.'
    );
}


if (
    mb_strlen(
        $nome
    ) > 120
) {

    primewayAlunoFalha(
        'O nome do aluno deve possuir no máximo 120 caracteres.'
    );
}


if (
    $matricula === ''
) {

    primewayAlunoFalha(
        'Informe a matrícula do aluno.'
    );
}


if (
    mb_strlen(
        $matricula
    ) > 50
) {

    primewayAlunoFalha(
        'A matrícula deve possuir no máximo 50 caracteres.'
    );
}

if (
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    mb_strlen($email) > 190
) {

    primewayAlunoFalha(
        'Informe um e-mail de acesso válido.',
        422
    );
}

if (
    $id === null &&
    mb_strlen($senha) < 8
) {

    primewayAlunoFalha(
        'A senha inicial deve ter pelo menos 8 caracteres.',
        422
    );
}

if (
    $senha !== '' &&
    (
        mb_strlen($senha) < 8 ||
        mb_strlen($senha) > 200
    )
) {

    primewayAlunoFalha(
        'A senha deve ter entre 8 e 200 caracteres.',
        422
    );
}

if (
    mb_strlen($telefone) > 30 ||
    mb_strlen($documento) > 30
) {

    primewayAlunoFalha(
        'Telefone ou documento excede o limite permitido.',
        422
    );
}

$nascimentoFinal = null;

if ($nascimento !== '') {

    $dataNascimento =
        DateTimeImmutable::createFromFormat(
            '!Y-m-d',
            $nascimento
        );

    if (
        !$dataNascimento ||
        $dataNascimento->format('Y-m-d') !== $nascimento
    ) {

        primewayAlunoFalha(
            'Data de nascimento inválida.',
            422
        );
    }

    $nascimentoFinal = $nascimento;
}


$statusPermitidos = [
    'ativo',
    'pendente',
    'inativo'
];


if (
    !in_array(
        $statusRecebido,
        $statusPermitidos,
        true
    )
) {

    primewayAlunoFalha(
        'Status do aluno inválido.'
    );
}


/*
    Aluno inativo não permanece com matrícula ativa.
*/

if (
    $statusRecebido ===
    'inativo'
) {

    $turmaId =
        null;
}


/*====================================================
                    BANCO
====================================================*/

try {

    $pdo =
        primewayPdo();

    $pdo->beginTransaction();


    /*================================================
                ANO LETIVO ATIVO
    ================================================*/

    $stmtAno =
        $pdo->query(
            '
                SELECT
                    id,
                    ano
                FROM anos_letivos
                WHERE ativo = 1
                ORDER BY ano DESC
                LIMIT 1
                FOR UPDATE
            '
        );

    $ano =
        $stmtAno->fetch();

    $anoLetivoId =
        $ano
            ? (int) $ano[
                'id'
            ]
            : null;


    if (
        $turmaId !== null &&
        $anoLetivoId === null
    ) {

        $pdo->rollBack();

        primewayAlunoFalha(
            'Nenhum ano letivo ativo foi encontrado para realizar a matrícula.',
            409
        );
    }


    /*================================================
                MATRÍCULA DUPLICADA
    ================================================*/

    $sqlDuplicada =
        '
            SELECT
                id
            FROM alunos
            WHERE matricula = :matricula
        ';

    if (
        $id !== null
    ) {

        $sqlDuplicada .=
            '
                AND id <> :id
            ';
    }

    $sqlDuplicada .=
        '
            LIMIT 1
            FOR UPDATE
        ';


    $stmtDuplicada =
        $pdo->prepare(
            $sqlDuplicada
        );

    $parametrosDuplicada = [
        ':matricula' =>
            $matricula
    ];

    if (
        $id !== null
    ) {

        $parametrosDuplicada[
            ':id'
        ] = $id;
    }

    $stmtDuplicada->execute(
        $parametrosDuplicada
    );


    if (
        $stmtDuplicada->fetch()
    ) {

        $pdo->rollBack();

        primewayAlunoFalha(
            'Esta matrícula já está cadastrada.',
            409
        );
    }


    /*================================================
                ALUNO EXISTENTE
    ================================================*/

    $registroAnterior =
        null;

    $pessoaId =
        null;


    if (
        $id !== null
    ) {

        $stmtAluno =
            $pdo->prepare(
                '
                    SELECT
                        a.id,
                        a.pessoa_id,
                        a.matricula,
                        a.status,
                        a.novo_aluno,
                        a.ingresso_em,
                        pe.nome,
                        pe.ativo AS pessoa_ativa,
                        u.id AS usuario_id,
                        u.email AS email_acesso
                    FROM alunos a
                    INNER JOIN pessoas pe
                        ON pe.id = a.pessoa_id
                    LEFT JOIN usuarios u
                        ON u.pessoa_id = pe.id
                       AND u.perfil = \'aluno\'
                    WHERE a.id = :id
                    LIMIT 1
                    FOR UPDATE
                '
            );

        $stmtAluno->execute([
            ':id' =>
                $id
        ]);

        $registroAnterior =
            $stmtAluno->fetch();


        if (
            !$registroAnterior
        ) {

            $pdo->rollBack();

            primewayAlunoFalha(
                'Aluno não encontrado.',
                404
            );
        }


        $pessoaId =
            (int) $registroAnterior[
                'pessoa_id'
            ];
    }


    /*================================================
            MATRÍCULA ATIVA ATUAL
    ================================================*/

    $matriculaAtual =
        null;


    if (
        $id !== null &&
        $anoLetivoId !== null
    ) {

        $stmtMatriculaAtual =
            $pdo->prepare(
                '
                    SELECT
                        m.id,
                        m.turma_id,
                        m.situacao,
                        t.nome AS turma_nome
                    FROM matriculas m
                    INNER JOIN turmas t
                        ON t.id = m.turma_id
                    WHERE m.aluno_id = :aluno_id
                      AND m.situacao = \'Ativa\'
                      AND t.ano_letivo_id = :ano_letivo_id
                    ORDER BY m.id
                    FOR UPDATE
                '
            );

        $stmtMatriculaAtual->execute([
            ':aluno_id' =>
                $id,

            ':ano_letivo_id' =>
                $anoLetivoId
        ]);

        $matriculasAtivas =
            $stmtMatriculaAtual->fetchAll();


        if (
            count(
                $matriculasAtivas
            ) > 1
        ) {

            throw new RuntimeException(
                'O aluno possui mais de uma matrícula ativa no ano letivo atual.'
            );
        }


        $matriculaAtual =
            $matriculasAtivas[
                0
            ] ??
            null;
    }


    $dadosAnteriores =
        $registroAnterior !== null
            ? [
                'id' =>
                    (int) $registroAnterior[
                        'id'
                    ],

                'personId' =>
                    (int) $registroAnterior[
                        'pessoa_id'
                    ],

                'name' =>
                    (string) $registroAnterior[
                        'nome'
                    ],

                'email' =>
                    (string) ($registroAnterior['email_acesso'] ?? ''),

                'hasAccess' =>
                    $registroAnterior['usuario_id'] !== null,

                'registration' =>
                    (string) $registroAnterior[
                        'matricula'
                    ],

                'status' =>
                    (string) $registroAnterior[
                        'status'
                    ],

                'newStudent' =>
                    (int) $registroAnterior[
                        'novo_aluno'
                    ] === 1,

                'classId' =>
                    $matriculaAtual
                        ? (int) $matriculaAtual[
                            'turma_id'
                        ]
                        : null,

                'className' =>
                    $matriculaAtual
                        ? (string) $matriculaAtual[
                            'turma_nome'
                        ]
                        : ''
            ]
            : null;


    /*================================================
                CRIAR / ATUALIZAR PESSOA
    ================================================*/

    if (
        $id === null
    ) {

        $stmtPessoa =
            $pdo->prepare(
                '
                    INSERT INTO pessoas (
                        nome,
                        email_contato,
                        telefone,
                        documento,
                        data_nascimento,
                        ativo
                    )
                    VALUES (
                        :nome,
                        :email,
                        :telefone,
                        :documento,
                        :nascimento,
                        1
                    )
                '
            );

        $stmtPessoa->execute([
            ':nome' =>
                $nome,

            ':email' =>
                $email,

            ':telefone' =>
                $telefone !== '' ? $telefone : null,

            ':documento' =>
                $documento !== '' ? $documento : null,

            ':nascimento' =>
                $nascimentoFinal
        ]);

        $pessoaId =
            (int) $pdo
                ->lastInsertId();


        $stmtAlunoSalvar =
            $pdo->prepare(
                '
                    INSERT INTO alunos (
                        pessoa_id,
                        matricula,
                        status,
                        novo_aluno,
                        ingresso_em
                    )
                    VALUES (
                        :pessoa_id,
                        :matricula,
                        :status,
                        1,
                        CURRENT_DATE
                    )
                '
            );

        $stmtAlunoSalvar->execute([
            ':pessoa_id' =>
                $pessoaId,

            ':matricula' =>
                $matricula,

            ':status' =>
                $statusRecebido
        ]);

        $id =
            (int) $pdo
                ->lastInsertId();

        $stmtUsuario =
            $pdo->prepare(
                '
                    INSERT INTO usuarios (
                        pessoa_id,
                        nome,
                        email,
                        senha_hash,
                        perfil,
                        ativo
                    )
                    VALUES (
                        :pessoa_id,
                        :nome,
                        :email,
                        :senha_hash,
                        \'aluno\',
                        :ativo
                    )
                '
            );

        $stmtUsuario->execute([
            ':pessoa_id' => $pessoaId,
            ':nome' => $nome,
            ':email' => $email,
            ':senha_hash' => password_hash($senha, PASSWORD_DEFAULT),
            ':ativo' => $statusRecebido === 'ativo' ? 1 : 0
        ]);

        $acaoAuditoria =
            'CRIAR_ALUNO';

        $mensagem =
            'Aluno cadastrado com sucesso.';

    } else {

        $stmtPessoa =
            $pdo->prepare(
                '
                    UPDATE pessoas
                    SET
                        nome = :nome,
                        email_contato = :email,
                        telefone = :telefone,
                        documento = :documento,
                        data_nascimento = :nascimento,
                        ativo = :ativo
                    WHERE id = :id
                '
            );

        $stmtPessoa->execute([
            ':nome' =>
                $nome,

            ':email' =>
                $email,

            ':telefone' =>
                $telefone !== '' ? $telefone : null,

            ':documento' =>
                $documento !== '' ? $documento : null,

            ':nascimento' =>
                $nascimentoFinal,

            ':ativo' =>
                $statusRecebido === 'ativo' ? 1 : 0,

            ':id' =>
                $pessoaId
        ]);


        $stmtAlunoSalvar =
            $pdo->prepare(
                '
                    UPDATE alunos
                    SET
                        matricula = :matricula,
                        status = :status
                    WHERE id = :id
                '
            );

        $stmtAlunoSalvar->execute([
            ':matricula' =>
                $matricula,

            ':status' =>
                $statusRecebido,

            ':id' =>
                $id
        ]);

        $usuarioId =
            primewayIdPositivo(
                $registroAnterior['usuario_id'] ?? null
            );

        if ($usuarioId === null && $senha === '') {

            throw new DomainException(
                'Este aluno ainda não possui acesso. Informe uma senha inicial.'
            );
        }

        if ($usuarioId === null) {

            $pdo->prepare(
                "INSERT INTO usuarios (pessoa_id, nome, email, senha_hash, perfil, ativo)
                 VALUES (:pessoa_id, :nome, :email, :senha_hash, 'aluno', :ativo)"
            )->execute([
                ':pessoa_id' => $pessoaId,
                ':nome' => $nome,
                ':email' => $email,
                ':senha_hash' => password_hash($senha, PASSWORD_DEFAULT),
                ':ativo' => $statusRecebido === 'ativo' ? 1 : 0
            ]);

        } else {

            $sqlUsuario =
                'UPDATE usuarios
                 SET nome = :nome, email = :email, ativo = :ativo';

            $parametrosUsuario = [
                ':nome' => $nome,
                ':email' => $email,
                ':ativo' => $statusRecebido === 'ativo' ? 1 : 0,
                ':id' => $usuarioId
            ];

            if ($senha !== '') {
                $sqlUsuario .= ', senha_hash = :senha_hash';
                $parametrosUsuario[':senha_hash'] =
                    password_hash($senha, PASSWORD_DEFAULT);
            }

            $sqlUsuario .= " WHERE id = :id AND perfil = 'aluno'";
            $pdo->prepare($sqlUsuario)->execute($parametrosUsuario);
        }

        $acaoAuditoria =
            'ALTERAR_ALUNO';

        $mensagem =
            'Aluno atualizado com sucesso.';
    }


    /*================================================
                ALTERAR MATRÍCULA EM TURMA
    ================================================*/

    $turmaAnteriorId =
        $matriculaAtual
            ? (int) $matriculaAtual[
                'turma_id'
            ]
            : null;

    $turmaAnteriorNome =
        $matriculaAtual
            ? (string) $matriculaAtual[
                'turma_nome'
            ]
            : '';

    $matriculaFinalId =
        $matriculaAtual
            ? (int) $matriculaAtual[
                'id'
            ]
            : null;

    $turmaFinalNome =
        $turmaAnteriorNome;


    $mesmaTurma =
        $turmaId !== null &&
        $turmaAnteriorId !== null &&
        $turmaId ===
            $turmaAnteriorId;


    if (
        !$mesmaTurma
    ) {

        if (
            $turmaId !== null
        ) {

            $stmtTurma =
                $pdo->prepare(
                    '
                        SELECT
                            id,
                            nome,
                            capacidade,
                            status,
                            ano_letivo_id
                        FROM turmas
                        WHERE id = :id
                        LIMIT 1
                        FOR UPDATE
                    '
                );

            $stmtTurma->execute([
                ':id' =>
                    $turmaId
            ]);

            $turma =
                $stmtTurma->fetch();


            if (
                !$turma
            ) {

                $pdo->rollBack();

                primewayAlunoFalha(
                    'Turma não encontrada.',
                    404
                );
            }


            if (
                (int) $turma[
                    'ano_letivo_id'
                ] !==
                $anoLetivoId
            ) {

                $pdo->rollBack();

                primewayAlunoFalha(
                    'A turma não pertence ao ano letivo ativo.',
                    409
                );
            }


            if (
                (string) $turma[
                    'status'
                ] !==
                'Ativa'
            ) {

                $pdo->rollBack();

                primewayAlunoFalha(
                    'Não é possível matricular um aluno em uma turma inativa.',
                    409
                );
            }


            $stmtOcupacao =
                $pdo->prepare(
                    '
                        SELECT
                            COUNT(*)
                        FROM matriculas
                        WHERE turma_id = :turma_id
                          AND situacao = \'Ativa\'
                    '
                );

            $stmtOcupacao->execute([
                ':turma_id' =>
                    $turmaId
            ]);

            $ocupacao =
                (int) $stmtOcupacao
                    ->fetchColumn();


            if (
                $ocupacao >=
                (int) $turma[
                    'capacidade'
                ]
            ) {

                $pdo->rollBack();

                primewayAlunoFalha(
                    'A turma atingiu sua capacidade máxima.',
                    409
                );
            }


            if (
                $matriculaAtual
            ) {

                $stmtTransferir =
                    $pdo->prepare(
                        '
                            UPDATE matriculas
                            SET situacao = \'Transferida\'
                            WHERE id = :id
                        '
                    );

                $stmtTransferir->execute([
                    ':id' =>
                        (int) $matriculaAtual[
                            'id'
                        ]
                ]);
            }


            $stmtExistente =
                $pdo->prepare(
                    '
                        SELECT
                            id
                        FROM matriculas
                        WHERE aluno_id = :aluno_id
                          AND turma_id = :turma_id
                        LIMIT 1
                        FOR UPDATE
                    '
                );

            $stmtExistente->execute([
                ':aluno_id' =>
                    $id,

                ':turma_id' =>
                    $turmaId
            ]);

            $matriculaDestino =
                $stmtExistente->fetch();


            if (
                $matriculaDestino
            ) {

                $stmtReativar =
                    $pdo->prepare(
                        '
                            UPDATE matriculas
                            SET
                                situacao = \'Ativa\',
                                data_matricula = CURRENT_DATE
                            WHERE id = :id
                        '
                    );

                $stmtReativar->execute([
                    ':id' =>
                        (int) $matriculaDestino[
                            'id'
                        ]
                ]);

                $matriculaFinalId =
                    (int) $matriculaDestino[
                        'id'
                    ];

            } else {

                $stmtInserirMatricula =
                    $pdo->prepare(
                        '
                            INSERT INTO matriculas (
                                aluno_id,
                                turma_id,
                                numero_chamada,
                                data_matricula,
                                situacao
                            )
                            VALUES (
                                :aluno_id,
                                :turma_id,
                                NULL,
                                CURRENT_DATE,
                                \'Ativa\'
                            )
                        '
                    );

                $stmtInserirMatricula->execute([
                    ':aluno_id' =>
                        $id,

                    ':turma_id' =>
                        $turmaId
                ]);

                $matriculaFinalId =
                    (int) $pdo
                        ->lastInsertId();
            }


            $turmaFinalNome =
                (string) $turma[
                    'nome'
                ];

        } elseif (
            $matriculaAtual
        ) {

            $stmtRemoverMatricula =
                $pdo->prepare(
                    '
                        UPDATE matriculas
                        SET situacao = \'Cancelada\'
                        WHERE id = :id
                    '
                );

            $stmtRemoverMatricula->execute([
                ':id' =>
                    (int) $matriculaAtual[
                        'id'
                    ]
            ]);

            $matriculaFinalId =
                null;

            $turmaFinalNome =
                '';
        }
    }


    /*================================================
                REGISTRO RESULTANTE
    ================================================*/

    $stmtResultado =
        $pdo->prepare(
            '
                SELECT
                    a.id,
                    a.pessoa_id,
                    a.matricula,
                    a.status,
                    a.novo_aluno,
                    a.ingresso_em,
                    pe.nome
                FROM alunos a
                INNER JOIN pessoas pe
                    ON pe.id = a.pessoa_id
                WHERE a.id = :id
                LIMIT 1
            '
        );

    $stmtResultado->execute([
        ':id' =>
            $id
    ]);

    $resultado =
        $stmtResultado->fetch();


    if (
        !$resultado
    ) {

        throw new RuntimeException(
            'O aluno salvo não pôde ser relido.'
        );
    }


    $dadosNovos = [
        'id' =>
            (int) $resultado[
                'id'
            ],

        'personId' =>
            (int) $resultado[
                'pessoa_id'
            ],

        'name' =>
            (string) $resultado[
                'nome'
            ],

        'registration' =>
            (string) $resultado[
                'matricula'
            ],

        'email' =>
            $email,

        'phone' =>
            $telefone,

        'document' =>
            $documento,

        'birthDate' =>
            $nascimentoFinal,

        'hasAccess' =>
            true,

        'status' =>
            (string) $resultado[
                'status'
            ],

        'newStudent' =>
            (int) $resultado[
                'novo_aluno'
            ] === 1,

        'entryDate' =>
            $resultado[
                'ingresso_em'
            ] !== null
                ? (string) $resultado[
                    'ingresso_em'
                ]
                : null,

        'classId' =>
            $turmaId,

        'className' =>
            $turmaId !== null
                ? $turmaFinalNome
                : '',

        'enrollmentId' =>
            $matriculaFinalId
    ];


    /*================================================
                    AUDITORIA
    ================================================*/

    $stmtAuditoria =
        $pdo->prepare(
            '
                INSERT INTO auditoria (
                    usuario_id,
                    acao,
                    entidade,
                    registro_id,
                    descricao,
                    dados_anteriores,
                    dados_novos,
                    endereco_ip,
                    user_agent
                )
                VALUES (
                    :usuario_id,
                    :acao,
                    :entidade,
                    :registro_id,
                    :descricao,
                    :dados_anteriores,
                    :dados_novos,
                    :endereco_ip,
                    :user_agent
                )
            '
        );

    $stmtAuditoria->execute([
        ':usuario_id' =>
            $usuario[
                'id'
            ],

        ':acao' =>
            $acaoAuditoria,

        ':entidade' =>
            'alunos',

        ':registro_id' =>
            $id,

        ':descricao' =>
            $mensagem,

        ':dados_anteriores' =>
            $dadosAnteriores !== null
                ? json_encode(
                    $dadosAnteriores,
                    JSON_UNESCAPED_UNICODE |
                    JSON_UNESCAPED_SLASHES
                )
                : null,

        ':dados_novos' =>
            json_encode(
                $dadosNovos,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            ),

        ':endereco_ip' =>
            isset(
                $_SERVER[
                    'REMOTE_ADDR'
                ]
            )
                ? substr(
                    (string) $_SERVER[
                        'REMOTE_ADDR'
                    ],
                    0,
                    45
                )
                : null,

        ':user_agent' =>
            isset(
                $_SERVER[
                    'HTTP_USER_AGENT'
                ]
            )
                ? substr(
                    (string) $_SERVER[
                        'HTTP_USER_AGENT'
                    ],
                    0,
                    500
                )
                : null
    ]);


    $pdo->commit();


    /*================================================
                    RESPOSTA
    ================================================*/

    primewayResponderJson(
        [
            'success' =>
                true,

            'message' =>
                $mensagem,

            'student' =>
                $dadosNovos
        ],
        $dadosAnteriores === null
            ? 201
            : 200
    );

} catch (DomainException $erro) {

    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    primewayAlunoFalha($erro->getMessage(), 422);

} catch (PDOException $erro) {

    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ((string) $erro->getCode() === '23000') {
        primewayAlunoFalha('E-mail ou documento já cadastrado.', 409);
    }

    error_log('PrimeWay Alunos POST: ' . $erro->getMessage());
    primewayAlunoFalha('Não foi possível salvar o aluno.', 500);

} catch (Throwable $erro) {

    if (
        isset(
            $pdo
        ) &&
        $pdo instanceof PDO &&
        $pdo->inTransaction()
    ) {

        $pdo->rollBack();
    }


    error_log(
        'PrimeWay Alunos POST: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível salvar o aluno.'
        ],
        500
    );
}

<?php

declare(strict_types=1);

/*====================================================
      MATRÍCULA EM TURMA - PRIMEWAY SCHOOL
      POST /api/turmas/matricula.php
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
                    CAMPOS
====================================================*/

$acao =
    strtolower(
        trim(
            (string) (
                $dados[
                    'action'
                ] ??
                ''
            )
        )
    );


$alunoId =
    primewayIdPositivo(
        $dados[
            'studentId'
        ] ??
        null
    );


$turmaId =
    primewayIdPositivo(
        $dados[
            'classId'
        ] ??
        null
    );


/*====================================================
                    VALIDAÇÃO
====================================================*/

$acoesPermitidas = [
    'assign',
    'remove'
];


if (
    !in_array(
        $acao,
        $acoesPermitidas,
        true
    )
) {

    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Ação de matrícula inválida.'
        ],
        400
    );
}


if (
    $alunoId ===
    null
) {

    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Identificador do aluno inválido.'
        ],
        400
    );
}


if (
    $turmaId ===
    null
) {

    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Identificador da turma inválido.'
        ],
        400
    );
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


    if (
        !$ano
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'Nenhum ano letivo ativo foi encontrado.'
            ],
            409
        );
    }


    $anoLetivoId =
        (int) $ano[
            'id'
        ];


    /*================================================
                    ALUNO
    ================================================*/

    $stmtAluno =
        $pdo->prepare(
            '
                SELECT
                    a.id,
                    a.matricula,
                    a.status,
                    pe.nome,
                    pe.ativo AS pessoa_ativa

                FROM alunos a

                INNER JOIN pessoas pe
                    ON pe.id = a.pessoa_id

                WHERE a.id = :id

                FOR UPDATE
            '
        );


    $stmtAluno->execute([
        ':id' =>
            $alunoId
    ]);


    $aluno =
        $stmtAluno->fetch();


    if (
        !$aluno
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'Aluno não encontrado.'
            ],
            404
        );
    }


    /*================================================
                    TURMA DESTINO
    ================================================*/

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


        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'Turma não encontrada.'
            ],
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


        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'A turma não pertence ao ano letivo ativo.'
            ],
            409
        );
    }


    /*================================================
            MATRÍCULA ATIVA ATUAL DO ALUNO
    ================================================*/

    $stmtAtual =
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


    $stmtAtual->execute([
        ':aluno_id' =>
            $alunoId,

        ':ano_letivo_id' =>
            $anoLetivoId
    ]);


    $matriculasAtivas =
        $stmtAtual->fetchAll();


    if (
        count(
            $matriculasAtivas
        ) > 1
    ) {

        throw new RuntimeException(
            'Aluno possui mais de uma matrícula ativa no mesmo ano letivo.'
        );
    }


    $matriculaAtual =
        $matriculasAtivas[
            0
        ] ??
        null;


    $matriculaAuditoriaId =
        null;


    /*================================================
                    REMOVER
    ================================================*/

    if (
        $acao ===
        'remove'
    ) {

        if (
            !$matriculaAtual ||
            (int) $matriculaAtual[
                'turma_id'
            ] !==
                $turmaId
        ) {

            $pdo->rollBack();


            primewayResponderJson(
                [
                    'success' =>
                        false,

                    'message' =>
                        'O aluno não está matriculado nesta turma.'
                ],
                409
            );
        }


        $matriculaAuditoriaId =
            (int) $matriculaAtual[
                'id'
            ];


        $stmtRemover =
            $pdo->prepare(
                '
                    UPDATE matriculas
                    SET
                        situacao = \'Cancelada\'
                    WHERE id = :id
                '
            );


        $stmtRemover->execute([
            ':id' =>
                (int) $matriculaAtual[
                    'id'
                ]
        ]);


        $acaoAuditoria =
            'REMOVER_ALUNO_TURMA';


        $descricao =
            sprintf(
                'Aluno removido da turma "%s".',
                (string) $turma[
                    'nome'
                ]
            );


        $dadosAnteriores = [
            'studentId' =>
                $alunoId,

            'classId' =>
                $turmaId,

            'className' =>
                (string) $turma[
                    'nome'
                ],

            'enrollmentId' =>
                (int) $matriculaAtual[
                    'id'
                ],

            'status' =>
                'Ativa'
        ];


        $dadosNovos = [
            'studentId' =>
                $alunoId,

            'classId' =>
                null,

            'className' =>
                '',

            'enrollmentId' =>
                (int) $matriculaAtual[
                    'id'
                ],

            'status' =>
                'Cancelada'
        ];


        $mensagem =
            'Aluno removido da turma com sucesso.';

    } else {

        /*================================================
                ADICIONAR / TRANSFERIR
        ================================================*/

        if (
            (string) $turma[
                'status'
            ] !==
                'Ativa'
        ) {

            $pdo->rollBack();


            primewayResponderJson(
                [
                    'success' =>
                        false,

                    'message' =>
                        'Não é possível matricular um aluno em uma turma inativa.'
                ],
                409
            );
        }


        if (
            (string) $aluno[
                'status'
            ] ===
                'inativo' ||
            (int) $aluno[
                'pessoa_ativa'
            ] !==
                1
        ) {

            $pdo->rollBack();


            primewayResponderJson(
                [
                    'success' =>
                        false,

                    'message' =>
                        'O aluno está inativo e não pode receber uma nova matrícula.'
                ],
                409
            );
        }


        /*
            Se já está na mesma turma, não há nada
            para alterar.
        */

        if (
            $matriculaAtual &&
            (int) $matriculaAtual[
                'turma_id'
            ] ===
                $turmaId
        ) {

            $pdo->commit();


            primewayResponderJson(
                [
                    'success' =>
                        true,

                    'message' =>
                        'O aluno já está matriculado nesta turma.'
                ]
            );
        }


        /*============================================
                    CAPACIDADE
        ============================================*/

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


            primewayResponderJson(
                [
                    'success' =>
                        false,

                    'message' =>
                        'A turma atingiu sua capacidade máxima.'
                ],
                409
            );
        }


        $turmaAnteriorId =
            null;

        $turmaAnteriorNome =
            '';


        /*============================================
                    TRANSFERÊNCIA
        ============================================*/

        if (
            $matriculaAtual
        ) {

            $turmaAnteriorId =
                (int) $matriculaAtual[
                    'turma_id'
                ];

            $turmaAnteriorNome =
                (string) $matriculaAtual[
                    'turma_nome'
                ];


            $stmtTransferir =
                $pdo->prepare(
                    '
                        UPDATE matriculas
                        SET
                            situacao = \'Transferida\'
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


        /*============================================
                MATRÍCULA ANTERIOR NO DESTINO
        ============================================*/

        /*
            A estrutura possui UNIQUE(aluno_id, turma_id).

            Portanto, se o aluno já passou por essa
            mesma turma anteriormente, reutilizamos o
            registro existente e o reativamos em vez
            de tentar inserir uma duplicata.
        */

        $stmtExistente =
            $pdo->prepare(
                '
                    SELECT
                        id,
                        situacao
                    FROM matriculas
                    WHERE aluno_id = :aluno_id
                      AND turma_id = :turma_id
                    LIMIT 1

                    FOR UPDATE
                '
            );


        $stmtExistente->execute([
            ':aluno_id' =>
                $alunoId,

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


            $matriculaDestinoId =
                (int) $matriculaDestino[
                    'id'
                ];

        } else {

            $stmtInserir =
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


            $stmtInserir->execute([
                ':aluno_id' =>
                    $alunoId,

                ':turma_id' =>
                    $turmaId
            ]);


            $matriculaDestinoId =
                (int) $pdo
                    ->lastInsertId();
        }


        if (
            $matriculaAtual
        ) {

            $acaoAuditoria =
                'TRANSFERIR_ALUNO';


            $descricao =
                sprintf(
                    'Aluno transferido de "%s" para "%s".',
                    $turmaAnteriorNome,
                    (string) $turma[
                        'nome'
                    ]
                );


            $mensagem =
                'Aluno transferido com sucesso.';

        } else {

            $acaoAuditoria =
                'MATRICULAR_ALUNO';


            $descricao =
                sprintf(
                    'Aluno matriculado na turma "%s".',
                    (string) $turma[
                        'nome'
                    ]
                );


            $mensagem =
                'Aluno adicionado à turma com sucesso.';
        }


        $matriculaAuditoriaId =
            $matriculaDestinoId;


        $dadosAnteriores = [
            'studentId' =>
                $alunoId,

            'classId' =>
                $turmaAnteriorId,

            'className' =>
                $turmaAnteriorNome,

            'enrollmentId' =>
                $matriculaAtual
                    ? (int) $matriculaAtual[
                        'id'
                    ]
                    : null
        ];


        $dadosNovos = [
            'studentId' =>
                $alunoId,

            'classId' =>
                $turmaId,

            'className' =>
                (string) $turma[
                    'nome'
                ],

            'enrollmentId' =>
                $matriculaDestinoId,

            'status' =>
                'Ativa'
        ];
    }


    if (
        $matriculaAuditoriaId ===
        null
    ) {

        throw new RuntimeException(
            'A matrícula alterada não pôde ser identificada para auditoria.'
        );
    }


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
                    dados_novos
                )
                VALUES (
                    :usuario_id,
                    :acao,
                    :entidade,
                    :registro_id,
                    :descricao,
                    :dados_anteriores,
                    :dados_novos
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
            'matriculas',

        ':registro_id' =>
            $matriculaAuditoriaId,

        ':descricao' =>
            $descricao,

        ':dados_anteriores' =>
            json_encode(
                $dadosAnteriores,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            ),

        ':dados_novos' =>
            json_encode(
                $dadosNovos,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            )
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

            'student' => [
                'id' =>
                    $alunoId,

                'name' =>
                    (string) $aluno[
                        'nome'
                    ],

                'registration' =>
                    (string) $aluno[
                        'matricula'
                    ],

                'classId' =>
                    $acao ===
                        'remove'
                        ? null
                        : $turmaId,

                'className' =>
                    $acao ===
                        'remove'
                        ? ''
                        : (string) $turma[
                            'nome'
                        ]
            ]
        ]
    );

} catch (
    Throwable $erro
) {

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
        'PrimeWay Matrícula Turma POST: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível alterar a matrícula do aluno.'
        ],
        500
    );
}

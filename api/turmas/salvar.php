<?php

declare(strict_types=1);

/*====================================================
        SALVAR TURMA - PRIMEWAY SCHOOL
        POST /api/turmas/salvar.php
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

function primewayTurmaTexto(
    mixed $valor
): string {

    if (
        !is_string(
            $valor
        )
    ) {
        return '';
    }


    return trim(
        $valor
    );
}


function primewayTurmaFalha(
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
    $idInformado !==
        null &&
    $idInformado !==
        '' &&
    $id ===
        null
) {

    primewayTurmaFalha(
        'Identificador da turma inválido.'
    );
}


$nome =
    primewayTurmaTexto(
        $dados[
            'name'
        ] ??
        ''
    );


$serie =
    primewayTurmaTexto(
        $dados[
            'grade'
        ] ??
        ''
    );


$turno =
    primewayTurmaTexto(
        $dados[
            'shift'
        ] ??
        ''
    );


$sala =
    primewayTurmaTexto(
        $dados[
            'room'
        ] ??
        ''
    );


$professorId =
    primewayIdPositivo(
        $dados[
            'teacherId'
        ] ??
        null
    );


$professorNome =
    primewayTurmaTexto(
        $dados[
            'teacher'
        ] ??
        ''
    );


$anoLetivo =
    $dados[
        'schoolYear'
    ] ??
    null;


$capacidade =
    $dados[
        'capacity'
    ] ??
    null;


$status =
    primewayTurmaTexto(
        $dados[
            'status'
        ] ??
        ''
    );


/*====================================================
                    VALIDAÇÃO
====================================================*/

if (
    $nome ===
    ''
) {

    primewayTurmaFalha(
        'Informe o nome da turma.'
    );
}


if (
    mb_strlen(
        $nome
    ) > 50
) {

    primewayTurmaFalha(
        'O nome da turma deve possuir no máximo 50 caracteres.'
    );
}


if (
    $serie ===
    ''
) {

    primewayTurmaFalha(
        'Informe a série ou ano da turma.'
    );
}


if (
    mb_strlen(
        $serie
    ) > 30
) {

    primewayTurmaFalha(
        'A série ou ano informado é muito longo.'
    );
}


$turnosPermitidos = [
    'Manhã',
    'Tarde',
    'Integral'
];


if (
    !in_array(
        $turno,
        $turnosPermitidos,
        true
    )
) {

    primewayTurmaFalha(
        'Turno inválido.'
    );
}


if (
    mb_strlen(
        $sala
    ) > 30
) {

    primewayTurmaFalha(
        'A sala deve possuir no máximo 30 caracteres.'
    );
}


if (
    !is_int(
        $anoLetivo
    ) &&
    !is_string(
        $anoLetivo
    ) &&
    !is_numeric(
        $anoLetivo
    )
) {

    primewayTurmaFalha(
        'Ano letivo inválido.'
    );
}


$anoLetivo =
    (int) $anoLetivo;


if (
    $anoLetivo < 2020 ||
    $anoLetivo > 2100
) {

    primewayTurmaFalha(
        'Informe um ano letivo entre 2020 e 2100.'
    );
}


if (
    !is_int(
        $capacidade
    ) &&
    !is_string(
        $capacidade
    ) &&
    !is_numeric(
        $capacidade
    )
) {

    primewayTurmaFalha(
        'Capacidade inválida.'
    );
}


if (
    !is_numeric(
        $capacidade
    )
) {

    primewayTurmaFalha(
        'Capacidade inválida.'
    );
}


$capacidadeNumero =
    (float) $capacidade;


if (
    floor(
        $capacidadeNumero
    ) !==
        $capacidadeNumero
) {

    primewayTurmaFalha(
        'A capacidade deve ser um número inteiro.'
    );
}


$capacidade =
    (int) $capacidadeNumero;


if (
    $capacidade < 1 ||
    $capacidade > 100
) {

    primewayTurmaFalha(
        'A capacidade deve estar entre 1 e 100 alunos.'
    );
}


$statusPermitidos = [
    'Ativa',
    'Inativa'
];


if (
    !in_array(
        $status,
        $statusPermitidos,
        true
    )
) {

    primewayTurmaFalha(
        'Status da turma inválido.'
    );
}


/*====================================================
                    BANCO
====================================================*/

try {

    $pdo =
        primewayPdo();


    /*================================================
                LOCALIZAR ANO LETIVO
    ================================================*/

    $stmtAno =
        $pdo->prepare(
            '
                SELECT
                    id,
                    ano
                FROM anos_letivos
                WHERE ano = :ano
                LIMIT 1
            '
        );


    $stmtAno->execute([
        ':ano' =>
            $anoLetivo
    ]);


    $registroAno =
        $stmtAno->fetch();


    if (
        !$registroAno
    ) {

        primewayTurmaFalha(
            'O ano letivo informado não está cadastrado.',
            409
        );
    }


    $anoLetivoId =
        (int) $registroAno[
            'id'
        ];


    /*================================================
                    PROFESSOR
    ================================================*/

    $professorFinalId =
        null;


    if (
        $professorId !==
        null
    ) {

        $stmtProfessor =
            $pdo->prepare(
                '
                    SELECT
                        p.id,
                        pe.nome
                    FROM professores p
                    INNER JOIN pessoas pe
                        ON pe.id = p.pessoa_id
                    WHERE p.id = :id
                    LIMIT 1
                '
            );


        $stmtProfessor->execute([
            ':id' =>
                $professorId
        ]);


        $professor =
            $stmtProfessor->fetch();


        if (
            !$professor
        ) {

            primewayTurmaFalha(
                'O professor informado não está cadastrado.',
                409
            );
        }


        $professorFinalId =
            (int) $professor[
                'id'
            ];

        $professorNome =
            (string) $professor[
                'nome'
            ];

    } elseif (
        $professorNome !==
        ''
    ) {

        /*
            Compatibilidade temporária com o formulário
            atual, que ainda utiliza o nome do professor.

            Não criamos professor automaticamente.
            Procuramos apenas professores já cadastrados.
        */

        $stmtProfessorNome =
            $pdo->prepare(
                '
                    SELECT
                        p.id,
                        pe.nome
                    FROM professores p
                    INNER JOIN pessoas pe
                        ON pe.id = p.pessoa_id
                    WHERE pe.nome = :nome
                    ORDER BY p.id
                    LIMIT 2
                '
            );


        $stmtProfessorNome->execute([
            ':nome' =>
                $professorNome
        ]);


        $professores =
            $stmtProfessorNome->fetchAll();


        if (
            count(
                $professores
            ) === 0
        ) {

            primewayTurmaFalha(
                'O professor informado ainda não está cadastrado no sistema.',
                409
            );
        }


        if (
            count(
                $professores
            ) > 1
        ) {

            primewayTurmaFalha(
                'Existe mais de um professor com esse nome. Será necessário selecionar o professor pelo cadastro.',
                409
            );
        }


        $professorFinalId =
            (int) $professores[
                0
            ][
                'id'
            ];

        $professorNome =
            (string) $professores[
                0
            ][
                'nome'
            ];
    }


    /*================================================
                    TRANSAÇÃO
    ================================================*/

    $pdo->beginTransaction();


    $registroAnterior =
        null;


    /*================================================
                    EDIÇÃO
    ================================================*/

    if (
        $id !==
        null
    ) {

        $stmtAnterior =
            $pdo->prepare(
                '
                    SELECT
                        t.id,
                        t.ano_letivo_id,
                        t.professor_id,
                        t.nome,
                        t.serie,
                        t.turno,
                        t.sala,
                        t.capacidade,
                        t.status,

                        al.ano AS ano_letivo

                    FROM turmas t

                    INNER JOIN anos_letivos al
                        ON al.id = t.ano_letivo_id

                    WHERE t.id = :id

                    FOR UPDATE
                '
            );


        $stmtAnterior->execute([
            ':id' =>
                $id
        ]);


        $registroAnterior =
            $stmtAnterior->fetch();


        if (
            !$registroAnterior
        ) {

            $pdo->rollBack();


            primewayTurmaFalha(
                'Turma não encontrada.',
                404
            );
        }


        /*============================================
            PROTEGER O HISTÓRICO DO ANO LETIVO
        ============================================*/

        if (
            (int) $registroAnterior[
                'ano_letivo_id'
            ] !==
                $anoLetivoId
        ) {

            $stmtMatriculas =
                $pdo->prepare(
                    '
                        SELECT
                            COUNT(*)
                        FROM matriculas
                        WHERE turma_id = :turma_id
                    '
                );


            $stmtMatriculas->execute([
                ':turma_id' =>
                    $id
            ]);


            $quantidadeMatriculas =
                (int) $stmtMatriculas
                    ->fetchColumn();


            if (
                $quantidadeMatriculas >
                0
            ) {

                $pdo->rollBack();


                primewayTurmaFalha(
                    'Não é possível alterar o ano letivo de uma turma que já possui matrículas.',
                    409
                );
            }
        }


        /*============================================
                CAPACIDADE X MATRÍCULAS
        ============================================*/

        $stmtAtivos =
            $pdo->prepare(
                '
                    SELECT
                        COUNT(*)
                    FROM matriculas
                    WHERE turma_id = :turma_id
                      AND situacao = \'Ativa\'
                '
            );


        $stmtAtivos->execute([
            ':turma_id' =>
                $id
        ]);


        $alunosAtivos =
            (int) $stmtAtivos
                ->fetchColumn();


        if (
            $capacidade <
            $alunosAtivos
        ) {

            $pdo->rollBack();


            primewayTurmaFalha(
                sprintf(
                    'A turma possui %d aluno(s) matriculado(s). A capacidade não pode ser menor que esse total.',
                    $alunosAtivos
                ),
                409
            );
        }
    }


    /*================================================
                NOME DUPLICADO NO ANO
    ================================================*/

    $sqlDuplicada =
        '
            SELECT
                id
            FROM turmas
            WHERE ano_letivo_id = :ano_letivo_id
              AND nome = :nome
        ';


    if (
        $id !==
        null
    ) {

        $sqlDuplicada .=
            '
                AND id <> :id
            ';
    }


    $sqlDuplicada .=
        '
            LIMIT 1
        ';


    $stmtDuplicada =
        $pdo->prepare(
            $sqlDuplicada
        );


    $parametrosDuplicada = [
        ':ano_letivo_id' =>
            $anoLetivoId,

        ':nome' =>
            $nome
    ];


    if (
        $id !==
        null
    ) {

        $parametrosDuplicada[
            ':id'
        ] =
            $id;
    }


    $stmtDuplicada->execute(
        $parametrosDuplicada
    );


    if (
        $stmtDuplicada->fetch()
    ) {

        $pdo->rollBack();


        primewayTurmaFalha(
            'Já existe uma turma com esse nome nesse ano letivo.',
            409
        );
    }


    /*================================================
                INSERT / UPDATE
    ================================================*/

    if (
        $id ===
        null
    ) {

        $stmtSalvar =
            $pdo->prepare(
                '
                    INSERT INTO turmas (
                        ano_letivo_id,
                        professor_id,
                        nome,
                        serie,
                        turno,
                        sala,
                        capacidade,
                        status
                    )
                    VALUES (
                        :ano_letivo_id,
                        :professor_id,
                        :nome,
                        :serie,
                        :turno,
                        :sala,
                        :capacidade,
                        :status
                    )
                '
            );


        $stmtSalvar->execute([
            ':ano_letivo_id' =>
                $anoLetivoId,

            ':professor_id' =>
                $professorFinalId,

            ':nome' =>
                $nome,

            ':serie' =>
                $serie,

            ':turno' =>
                $turno,

            ':sala' =>
                $sala !== ''
                    ? $sala
                    : null,

            ':capacidade' =>
                $capacidade,

            ':status' =>
                $status
        ]);


        $id =
            (int) $pdo->lastInsertId();


        $acaoAuditoria =
            'CRIAR_TURMA';

        $mensagem =
            'Turma cadastrada com sucesso.';

    } else {

        $stmtSalvar =
            $pdo->prepare(
                '
                    UPDATE turmas
                    SET
                        ano_letivo_id = :ano_letivo_id,
                        professor_id = :professor_id,
                        nome = :nome,
                        serie = :serie,
                        turno = :turno,
                        sala = :sala,
                        capacidade = :capacidade,
                        status = :status
                    WHERE id = :id
                '
            );


        $stmtSalvar->execute([
            ':ano_letivo_id' =>
                $anoLetivoId,

            ':professor_id' =>
                $professorFinalId,

            ':nome' =>
                $nome,

            ':serie' =>
                $serie,

            ':turno' =>
                $turno,

            ':sala' =>
                $sala !== ''
                    ? $sala
                    : null,

            ':capacidade' =>
                $capacidade,

            ':status' =>
                $status,

            ':id' =>
                $id
        ]);


        $acaoAuditoria =
            'ALTERAR_TURMA';

        $mensagem =
            'Turma atualizada com sucesso.';
    }


    /*================================================
                REGISTRO RESULTANTE
    ================================================*/

    $stmtResultado =
        $pdo->prepare(
            '
                SELECT
                    t.id,
                    t.nome,
                    t.serie,
                    t.turno,
                    t.sala,
                    t.capacidade,
                    t.status,

                    al.ano AS ano_letivo,

                    p.id AS professor_id,

                    pe.nome AS professor_nome,

                    (
                        SELECT
                            COUNT(*)
                        FROM matriculas m
                        WHERE m.turma_id = t.id
                          AND m.situacao = \'Ativa\'
                    ) AS quantidade_alunos

                FROM turmas t

                INNER JOIN anos_letivos al
                    ON al.id = t.ano_letivo_id

                LEFT JOIN professores p
                    ON p.id = t.professor_id

                LEFT JOIN pessoas pe
                    ON pe.id = p.pessoa_id

                WHERE t.id = :id

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
            'A turma salva não pôde ser relida.'
        );
    }


    $turmaResposta = [

        'id' =>
            (int) $resultado[
                'id'
            ],

        'name' =>
            (string) $resultado[
                'nome'
            ],

        'grade' =>
            (string) $resultado[
                'serie'
            ],

        'shift' =>
            (string) $resultado[
                'turno'
            ],

        'room' =>
            (string) (
                $resultado[
                    'sala'
                ] ??
                ''
            ),

        'teacher' =>
            (string) (
                $resultado[
                    'professor_nome'
                ] ??
                ''
            ),

        'teacherId' =>
            $resultado[
                'professor_id'
            ] !==
                null
                ? (int) $resultado[
                    'professor_id'
                ]
                : null,

        'capacity' =>
            (int) $resultado[
                'capacidade'
            ],

        'schoolYear' =>
            (int) $resultado[
                'ano_letivo'
            ],

        'status' =>
            (string) $resultado[
                'status'
            ],

        'studentCount' =>
            (int) $resultado[
                'quantidade_alunos'
            ]
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
            'turmas',

        ':registro_id' =>
            $id,

        ':descricao' =>
            $mensagem,

        ':dados_anteriores' =>
            $registroAnterior !==
            null
                ? json_encode(
                    $registroAnterior,
                    JSON_UNESCAPED_UNICODE |
                    JSON_UNESCAPED_SLASHES
                )
                : null,

        ':dados_novos' =>
            json_encode(
                $turmaResposta,
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

            'class' =>
                $turmaResposta
        ],
        $registroAnterior ===
            null
            ? 201
            : 200
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
        'PrimeWay Turmas POST: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível salvar a turma.'
        ],
        500
    );
}

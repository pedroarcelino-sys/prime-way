<?php

declare(strict_types=1);

/*====================================================
        ALUNOS API - PRIMEWAY SCHOOL
        GET /api/alunos/index.php
====================================================*/

require_once
    __DIR__ .
    '/../_bootstrap.php';


/*====================================================
                    REQUISIÇÃO
====================================================*/

primewayExigirMetodo(
    'GET'
);

primewayExigirPerfis([
    'admin'
]);


/*====================================================
                    BANCO
====================================================*/

try {

    $pdo =
        primewayPdo();


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
            '
        );

    $ano =
        $stmtAno->fetch();

    $anoLetivoId =
        $ano
            ? (int) $ano['id']
            : 0;


    /*================================================
                    ALUNOS
    ================================================*/

    /*
        Regras deste endpoint:

        - identidade vem de pessoas;
        - dados acadêmicos próprios vêm de alunos;
        - turma atual vem de matriculas;
        - média vem de notas + avaliacoes;
        - frequência vem de frequencias + aulas.

        Média:
            normalizamos cada nota para escala 0-10
            e aplicamos o peso da avaliação.

        Frequência:
            Presente e Atraso contam como presença;
            Falta e Justificada não contam como presença.

        Essa política de frequência pode ser centralizada
        futuramente em Configurações caso a escola precise
        de outra regra.
    */

    $stmt =
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

                    m.id AS matricula_turma_id,
                    t.id AS turma_id,
                    t.nome AS turma_nome,

                    (
                        SELECT
                            ROUND(
                                SUM(
                                    (
                                        n.valor /
                                        NULLIF(av.valor_maximo, 0)
                                    ) * 10 * av.peso
                                ) /
                                NULLIF(
                                    SUM(av.peso),
                                    0
                                ),
                                1
                            )
                        FROM notas n
                        INNER JOIN avaliacoes av
                            ON av.id = n.avaliacao_id
                        WHERE n.matricula_id = m.id
                          AND av.status <> \'Cancelada\'
                    ) AS media,

                    (
                        SELECT
                            ROUND(
                                100 *
                                SUM(
                                    CASE
                                        WHEN f.situacao IN (
                                            \'Presente\',
                                            \'Atraso\'
                                        )
                                        THEN 1
                                        ELSE 0
                                    END
                                ) /
                                NULLIF(
                                    COUNT(*),
                                    0
                                ),
                                0
                            )
                        FROM frequencias f
                        INNER JOIN aulas au
                            ON au.id = f.aula_id
                        WHERE f.matricula_id = m.id
                          AND au.status = \'Realizada\'
                    ) AS frequencia

                FROM alunos a

                INNER JOIN pessoas pe
                    ON pe.id = a.pessoa_id

                LEFT JOIN matriculas m
                    ON m.aluno_id = a.id
                   AND m.situacao = \'Ativa\'
                   AND EXISTS (
                        SELECT
                            1
                        FROM turmas tx
                        WHERE tx.id = m.turma_id
                          AND tx.ano_letivo_id = :ano_letivo_id
                   )

                LEFT JOIN turmas t
                    ON t.id = m.turma_id

                ORDER BY
                    pe.nome ASC,
                    a.id ASC
            '
        );

    $stmt->execute([
        ':ano_letivo_id' =>
            $anoLetivoId
    ]);


    $alunos = [];

    $alunosEncontrados = [];


    while (
        $linha =
            $stmt->fetch()
    ) {

        $alunoId =
            (int) $linha[
                'id'
            ];


        if (
            isset(
                $alunosEncontrados[
                    $alunoId
                ]
            )
        ) {

            throw new RuntimeException(
                sprintf(
                    'O aluno %d possui mais de uma matrícula ativa no ano letivo atual.',
                    $alunoId
                )
            );
        }


        $alunosEncontrados[
            $alunoId
        ] = true;


        $statusBanco =
            (string) $linha[
                'status'
            ];

        $pessoaAtiva =
            (int) $linha[
                'pessoa_ativa'
            ] === 1;


        $statusExibicao =
            !$pessoaAtiva
                ? 'Inativo'
                : match (
                    $statusBanco
                ) {
                    'ativo' =>
                        'Ativo',

                    'pendente' =>
                        'Pendente',

                    default =>
                        'Inativo'
                };


        $alunos[] = [

            'id' =>
                $alunoId,

            'personId' =>
                (int) $linha[
                    'pessoa_id'
                ],

            'name' =>
                (string) $linha[
                    'nome'
                ],

            'registration' =>
                (string) $linha[
                    'matricula'
                ],

            'status' =>
                $statusExibicao,

            'newStudent' =>
                (int) $linha[
                    'novo_aluno'
                ] === 1,

            'entryDate' =>
                $linha[
                    'ingresso_em'
                ] !== null
                    ? (string) $linha[
                        'ingresso_em'
                    ]
                    : null,

            'classId' =>
                $linha[
                    'turma_id'
                ] !== null
                    ? (int) $linha[
                        'turma_id'
                    ]
                    : null,

            'className' =>
                (string) (
                    $linha[
                        'turma_nome'
                    ] ??
                    ''
                ),

            'enrollmentId' =>
                $linha[
                    'matricula_turma_id'
                ] !== null
                    ? (int) $linha[
                        'matricula_turma_id'
                    ]
                    : null,

            'average' =>
                $linha[
                    'media'
                ] !== null
                    ? (float) $linha[
                        'media'
                    ]
                    : null,

            'attendance' =>
                $linha[
                    'frequencia'
                ] !== null
                    ? (float) $linha[
                        'frequencia'
                    ]
                    : null,

            'personActive' =>
                $pessoaAtiva
        ];
    }


    /*================================================
                    RESPOSTA
    ================================================*/

    primewayResponderJson(
        [
            'success' =>
                true,

            'students' =>
                $alunos,

            'activeSchoolYear' =>
                $ano
                    ? [
                        'id' =>
                            (int) $ano[
                                'id'
                            ],

                        'year' =>
                            (int) $ano[
                                'ano'
                            ]
                    ]
                    : null
        ]
    );

} catch (
    Throwable $erro
) {

    error_log(
        'PrimeWay Alunos GET: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível carregar os alunos.'
        ],
        500
    );
}
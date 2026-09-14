<?php

declare(strict_types=1);

/*====================================================
        ALUNOS DAS TURMAS - PRIMEWAY SCHOOL
        GET /api/turmas/alunos.php
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


    if (
        !$ano
    ) {

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
                    ALUNOS
    ================================================*/

    /*
        Precisamos descobrir, para cada aluno:

        - quem é o aluno;
        - sua matrícula institucional;
        - seu status;
        - sua turma ATIVA no ano letivo atual.

        A turma não é armazenada em alunos.
        O vínculo oficial é matriculas.
    */

    $stmt =
        $pdo->prepare(
            '
                SELECT
                    a.id,
                    a.matricula,
                    a.status,
                    a.novo_aluno,

                    pe.nome,
                    pe.ativo AS pessoa_ativa,

                    m.id AS matricula_turma_id,
                    m.situacao AS situacao_matricula,

                    t.id AS turma_id,
                    t.nome AS turma_nome

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


    $alunos =
        [];


    /*
        Também usamos este array para detectar um estado
        inválido caso algum aluno possua mais de uma
        matrícula ativa no mesmo ano.

        Nossa futura API impedirá isso, mas não escondemos
        uma inconsistência já existente no banco.
    */

    $alunosEncontrados =
        [];


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
                    'O aluno %d possui mais de uma matrícula ativa no ano letivo %d.',
                    $alunoId,
                    (int) $ano[
                        'ano'
                    ]
                )
            );
        }


        $alunosEncontrados[
            $alunoId
        ] =
            true;


        $pessoaAtiva =
            (int) $linha[
                'pessoa_ativa'
            ] === 1;


        $statusAluno =
            (string) $linha[
                'status'
            ];


        /*
            Aluno inativo continua aparecendo para
            preservar informação histórica, mas não
            poderá receber uma nova matrícula.
        */

        $disponivel =
            $pessoaAtiva &&
            $statusAluno !==
                'inativo';


        $alunos[] = [

            'id' =>
                $alunoId,

            'name' =>
                (string) $linha[
                    'nome'
                ],

            'registration' =>
                (string) $linha[
                    'matricula'
                ],

            'status' =>
                match (
                    $statusAluno
                ) {

                    'ativo' =>
                        'Ativo',

                    'inativo' =>
                        'Inativo',

                    default =>
                        'Pendente'
                },

            'newStudent' =>
                (int) $linha[
                    'novo_aluno'
                ] === 1,

            'classId' =>
                $linha[
                    'turma_id'
                ] !==
                    null
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
                ] !==
                    null
                    ? (int) $linha[
                        'matricula_turma_id'
                    ]
                    : null,

            'available' =>
                $disponivel
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

            'activeSchoolYear' => [
                'id' =>
                    $anoLetivoId,

                'year' =>
                    (int) $ano[
                        'ano'
                    ]
            ]
        ]
    );

} catch (
    Throwable $erro
) {

    error_log(
        'PrimeWay Turmas Alunos GET: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível carregar os alunos das turmas.'
        ],
        500
    );
}
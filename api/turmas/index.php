<?php

declare(strict_types=1);

/*====================================================
            TURMAS API - PRIMEWAY SCHOOL
            GET /api/turmas/index.php
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
                    LISTAR TURMAS
    ================================================*/

    $stmt =
        $pdo->query(
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

                    pp.nome AS professor_nome,

                    COUNT(
                        m.id
                    ) AS quantidade_alunos

                FROM turmas t

                INNER JOIN anos_letivos al
                    ON al.id = t.ano_letivo_id

                LEFT JOIN professores p
                    ON p.id = t.professor_id

                LEFT JOIN pessoas pp
                    ON pp.id = p.pessoa_id

                LEFT JOIN matriculas m
                    ON m.turma_id = t.id
                   AND m.situacao = \'Ativa\'

                GROUP BY
                    t.id,
                    t.nome,
                    t.serie,
                    t.turno,
                    t.sala,
                    t.capacidade,
                    t.status,
                    al.ano,
                    p.id,
                    pp.nome

                ORDER BY
                    al.ano DESC,
                    t.nome ASC
            '
        );


    $turmas =
        [];


    while (
        $linha =
            $stmt->fetch()
    ) {

        $turmas[] = [

            'id' =>
                (int) $linha[
                    'id'
                ],

            'name' =>
                (string) $linha[
                    'nome'
                ],

            'grade' =>
                (string) $linha[
                    'serie'
                ],

            'shift' =>
                (string) $linha[
                    'turno'
                ],

            'room' =>
                (string) (
                    $linha[
                        'sala'
                    ] ??
                    ''
                ),

            'teacher' =>
                (string) (
                    $linha[
                        'professor_nome'
                    ] ??
                    ''
                ),

            'teacherId' =>
                $linha[
                    'professor_id'
                ] !==
                    null
                    ? (int) $linha[
                        'professor_id'
                    ]
                    : null,

            'capacity' =>
                (int) $linha[
                    'capacidade'
                ],

            'schoolYear' =>
                (int) $linha[
                    'ano_letivo'
                ],

            'status' =>
                (string) $linha[
                    'status'
                ],

            /*
                A quantidade não é armazenada na turma.

                Ela é calculada pelas matrículas ativas.
            */
            'studentCount' =>
                (int) $linha[
                    'quantidade_alunos'
                ]
        ];
    }


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


    $anoAtivo =
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
            : null;


    /*================================================
                    RESPOSTA
    ================================================*/

    primewayResponderJson(
        [
            'success' =>
                true,

            'classes' =>
                $turmas,

            'activeSchoolYear' =>
                $anoAtivo
        ]
    );

} catch (
    Throwable $erro
) {

    error_log(
        'PrimeWay Turmas GET: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível carregar as turmas.'
        ],
        500
    );
}
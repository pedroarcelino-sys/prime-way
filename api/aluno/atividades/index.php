<?php

declare(strict_types=1);

require_once __DIR__ . '/_contexto.php';


primewayExigirMetodo(
    'GET'
);


$usuario =
    primewayExigirPerfis([
        'aluno'
    ]);


try {

    $pdo =
        primewayPdo();


    $contexto =
        primewayAtividadesContextoAluno(
            $pdo,
            $usuario
        );


    $matricula =
        $contexto[
            'enrollment'
        ];


    /*====================================================
                ALUNO SEM MATRÍCULA
    ====================================================*/

    if (
        $matricula === null
    ) {

        primewayResponderJson([

            'success' =>
                true,

            'student' =>
                $contexto[
                    'student'
                ],

            'schoolYear' =>
                $contexto[
                    'schoolYear'
                ],

            'enrollment' =>
                null,

            'summary' => [

                'total' =>
                    0,

                'pending' =>
                    0,

                'submitted' =>
                    0,

                'corrected' =>
                    0,

                'late' =>
                    0
            ],

            'activities' =>
                [],

            'csrfToken' =>
                primewayTokenCsrf()
        ]);
    }


    /*====================================================
                    ATIVIDADES
    ====================================================*/

    $stmt =
        $pdo->prepare(
            "SELECT

                atv.id,
                atv.titulo,
                atv.descricao,
                atv.tipo_entrega,
                atv.data_publicacao,
                atv.data_entrega,
                atv.status AS atividade_status,

                atv.permite_atraso,
                atv.permite_reenvio,
                atv.permite_comentarios,
                atv.max_arquivos,
                atv.tamanho_maximo_arquivo_mb,

                td.id AS turma_disciplina_id,

                d.id AS disciplina_id,
                d.nome AS disciplina_nome,
                d.codigo AS disciplina_codigo,

                pl.id AS periodo_id,
                pl.nome AS periodo_nome,

                p.id AS professor_id,
                pp.nome AS professor_nome,

                ea.id AS entrega_id,
                ea.status AS entrega_status,
                ea.entregue_em,
                ea.rascunho_salvo_em,
                ea.retirada_em,
                ea.devolvida_em,
                ea.corrigida_em,
                ea.correcao_publicada_em,
                ea.ultima_versao,

                av.id AS avaliacao_id,
                av.valor_maximo,
                av.peso,

                n.valor AS nota_valor,

                CASE
                    WHEN
                        atv.data_entrega IS NOT NULL
                        AND
                        atv.data_entrega < NOW()
                    THEN 1
                    ELSE 0
                END AS prazo_encerrado,

                (
                    SELECT COUNT(*)

                    FROM atividade_anexos aa

                    WHERE
                        aa.atividade_id =
                        atv.id
                ) AS quantidade_anexos,

                (
                    SELECT COUNT(*)

                    FROM atividade_comentarios ac

                    WHERE
                        ac.entrega_id =
                        ea.id

                        AND
                        ac.excluido_em IS NULL
                ) AS quantidade_comentarios


             FROM atividades atv


             INNER JOIN turma_disciplinas td
                ON td.id =
                   atv.turma_disciplina_id


             INNER JOIN disciplinas d
                ON d.id =
                   td.disciplina_id


             INNER JOIN periodos_letivos pl
                ON pl.id =
                   atv.periodo_letivo_id


             INNER JOIN professores p
                ON p.id =
                   td.professor_id


             INNER JOIN pessoas pp
                ON pp.id =
                   p.pessoa_id


             LEFT JOIN entregas_atividades ea
                ON ea.atividade_id =
                   atv.id

               AND ea.matricula_id =
                   :matricula_id


             LEFT JOIN avaliacoes av

                ON av.id = (

                    SELECT
                        MAX(
                            av2.id
                        )

                    FROM avaliacoes av2

                    WHERE
                        av2.atividade_id =
                        atv.id

                        AND
                        av2.status <>
                        'Cancelada'
                )


             LEFT JOIN notas n
                ON n.avaliacao_id =
                   av.id

               AND n.matricula_id =
                   :matricula_id_nota


             WHERE

                td.turma_id =
                :turma_id

                AND
                td.status =
                'Ativa'

                AND
                d.status =
                'Ativa'

                AND
                atv.status IN (
                    'Publicada',
                    'Encerrada'
                )

                AND (
                    atv.data_publicacao IS NULL

                    OR

                    atv.data_publicacao <= NOW()
                )


             ORDER BY

                CASE
                    WHEN
                        atv.data_entrega IS NULL
                    THEN 1
                    ELSE 0
                END,

                atv.data_entrega ASC,

                atv.id DESC"
        );


    $stmt->execute([

        ':matricula_id' =>
            (int) $matricula[
                'id'
            ],

        ':matricula_id_nota' =>
            (int) $matricula[
                'id'
            ],

        ':turma_id' =>
            (int) $matricula[
                'classId'
            ]
    ]);


    $atividades =
        [];


    foreach (
        $stmt->fetchAll()
        as $linha
    ) {

        $prazoEncerrado =
            (int) $linha[
                'prazo_encerrado'
            ] === 1;


        $statusEntrega =
            $linha[
                'entrega_status'
            ] !== null

                ? (string) $linha[
                    'entrega_status'
                ]

                : null;


        $correcaoPublicada =
            $linha[
                'correcao_publicada_em'
            ] !== null;


        $notaVisivel =
            $correcaoPublicada &&
            $linha[
                'nota_valor'
            ] !== null;


        $valorMaximo =
            $linha[
                'valor_maximo'
            ] !== null

                ? (float) $linha[
                    'valor_maximo'
                ]

                : null;


        $notaValor =
            $notaVisivel

                ? (float) $linha[
                    'nota_valor'
                ]

                : null;


        $atividades[] = [

            'id' =>
                (int) $linha[
                    'id'
                ],

            'title' =>
                (string) $linha[
                    'titulo'
                ],

            'description' =>
                (string) (
                    $linha[
                        'descricao'
                    ] ?? ''
                ),

            'submissionType' =>
                (string) $linha[
                    'tipo_entrega'
                ],

            'publishedAt' =>
                $linha[
                    'data_publicacao'
                ],

            'dueAt' =>
                $linha[
                    'data_entrega'
                ],

            'status' =>
                (string) $linha[
                    'atividade_status'
                ],

            'deadlinePassed' =>
                $prazoEncerrado,

            'allowsLateSubmission' =>
                (int) $linha[
                    'permite_atraso'
                ] === 1,

            'allowsResubmission' =>
                (int) $linha[
                    'permite_reenvio'
                ] === 1,

            'allowsComments' =>
                (int) $linha[
                    'permite_comentarios'
                ] === 1,

            'maxFiles' =>
                (int) $linha[
                    'max_arquivos'
                ],

            'maxFileSizeMb' =>
                (int) $linha[
                    'tamanho_maximo_arquivo_mb'
                ],


            'subject' => [

                'id' =>
                    (int) $linha[
                        'disciplina_id'
                    ],

                'code' =>
                    (string) $linha[
                        'disciplina_codigo'
                    ],

                'name' =>
                    (string) $linha[
                        'disciplina_nome'
                    ]
            ],


            'period' => [

                'id' =>
                    (int) $linha[
                        'periodo_id'
                    ],

                'name' =>
                    (string) $linha[
                        'periodo_nome'
                    ]
            ],


            'teacher' => [

                'id' =>
                    (int) $linha[
                        'professor_id'
                    ],

                'name' =>
                    (string) $linha[
                        'professor_nome'
                    ]
            ],


            'submission' => [

                'id' =>
                    $linha[
                        'entrega_id'
                    ] !== null

                        ? (int) $linha[
                            'entrega_id'
                        ]

                        : null,

                'status' =>
                    primewayStatusEntregaAluno(
                        $statusEntrega,
                        $prazoEncerrado
                    ),

                'databaseStatus' =>
                    $statusEntrega,

                'submittedAt' =>
                    $linha[
                        'entregue_em'
                    ],

                'draftSavedAt' =>
                    $linha[
                        'rascunho_salvo_em'
                    ],

                'withdrawnAt' =>
                    $linha[
                        'retirada_em'
                    ],

                'returnedAt' =>
                    $linha[
                        'devolvida_em'
                    ],

                'correctedAt' =>
                    $linha[
                        'corrigida_em'
                    ],

                'correctionPublishedAt' =>
                    $linha[
                        'correcao_publicada_em'
                    ],

                'version' =>
                    (int) (
                        $linha[
                            'ultima_versao'
                        ] ?? 0
                    )
            ],


            'grade' => [

                'published' =>
                    $correcaoPublicada,

                'value' =>
                    $notaValor,

                'maximum' =>
                    $valorMaximo,

                'normalized' =>
                    $notaValor !== null &&
                    $valorMaximo !== null &&
                    $valorMaximo > 0

                        ? round(
                            (
                                $notaValor /
                                $valorMaximo
                            ) * 10,
                            1
                        )

                        : null,

                'weight' =>
                    $linha[
                        'peso'
                    ] !== null

                        ? (float) $linha[
                            'peso'
                        ]

                        : null
            ],


            'attachmentsCount' =>
                (int) $linha[
                    'quantidade_anexos'
                ],

            'commentsCount' =>
                (int) $linha[
                    'quantidade_comentarios'
                ],

            'permissions' =>
                primewayPermissoesAtividadeAluno(
                    $linha
                )
        ];
    }


    /*====================================================
                    RESUMO
    ====================================================*/

    $resumo = [

        'total' =>
            count(
                $atividades
            ),

        'pending' =>
            0,

        'submitted' =>
            0,

        'corrected' =>
            0,

        'late' =>
            0
    ];


    foreach (
        $atividades
        as $atividade
    ) {

        $status =
            (string) $atividade[
                'submission'
            ][
                'status'
            ];


        if (
            in_array(
                $status,
                [
                    'Não iniciada',
                    'Rascunho',
                    'Não entregue',
                    'Devolvida para correção'
                ],
                true
            )
        ) {

            $resumo[
                'pending'
            ]++;
        }


        if (
            in_array(
                $status,
                [
                    'Entregue',
                    'Reenviada',
                    'Entregue com atraso',
                    'Corrigida'
                ],
                true
            )
        ) {

            $resumo[
                'submitted'
            ]++;
        }


        if (
            $status ===
            'Corrigida'
        ) {

            $resumo[
                'corrected'
            ]++;
        }


        if (
            $status ===
            'Entregue com atraso'
        ) {

            $resumo[
                'late'
            ]++;
        }
    }


    /*====================================================
                    RESPOSTA
    ====================================================*/

    primewayResponderJson([

        'success' =>
            true,

        'student' =>
            $contexto[
                'student'
            ],

        'schoolYear' =>
            $contexto[
                'schoolYear'
            ],

        'enrollment' =>
            $matricula,

        'summary' =>
            $resumo,

        'activities' =>
            $atividades,

        'csrfToken' =>
            primewayTokenCsrf()
    ]);


} catch (
    Throwable $erro
) {

    error_log(
        'PrimeWay Aluno Atividades GET: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível carregar as atividades do aluno.'
        ],
        500
    );
}
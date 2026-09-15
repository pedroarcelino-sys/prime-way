<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';


primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'professor'
    ]);


/*====================================================
                    ATIVIDADE
====================================================*/

$atividadeId =
    primewayIdPositivo(
        $_GET['atividadeId']
        ?? $_GET['id']
        ?? null
    );


if ($atividadeId === null) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Atividade inválida.'
        ],
        400
    );
}


try {

    $pdo =
        primewayPdo();


    /*====================================================
                    PROFESSOR
    ====================================================*/

    $stmtProfessor =
        $pdo->prepare(
            "SELECT
                pr.id,
                pe.nome

             FROM usuarios u

             INNER JOIN pessoas pe
                ON pe.id =
                   u.pessoa_id

             INNER JOIN professores pr
                ON pr.pessoa_id =
                   pe.id

             WHERE
                u.id =
                :usuario_id

             LIMIT 1"
        );


    $stmtProfessor->execute([
        ':usuario_id' =>
            (int) $usuario['id']
    ]);


    $professor =
        $stmtProfessor->fetch();


    if (!$professor) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Esta conta não está vinculada a um professor.'
            ],
            404
        );
    }


    $professorId =
        (int) $professor['id'];


    /*====================================================
                    ATIVIDADE
    ====================================================*/

    $stmtAtividade =
        $pdo->prepare(
            "SELECT

                atv.id,
                atv.titulo,
                atv.descricao,
                atv.instrucoes,
                atv.tipo_entrega,
                atv.data_publicacao,
                atv.data_entrega,
                atv.status,

                td.id AS turma_disciplina_id,

                t.id AS turma_id,
                t.nome AS turma_nome,
                t.serie,
                t.turno,

                d.id AS disciplina_id,
                d.codigo AS disciplina_codigo,
                d.nome AS disciplina_nome,

                pl.id AS periodo_id,
                pl.nome AS periodo_nome

             FROM atividades atv

             INNER JOIN turma_disciplinas td
                ON td.id =
                   atv.turma_disciplina_id

             INNER JOIN turmas t
                ON t.id =
                   td.turma_id

             INNER JOIN disciplinas d
                ON d.id =
                   td.disciplina_id

             INNER JOIN periodos_letivos pl
                ON pl.id =
                   atv.periodo_letivo_id

             WHERE
                atv.id =
                :atividade_id

                AND
                td.professor_id =
                :professor_id

             LIMIT 1"
        );


    $stmtAtividade->execute([
        ':atividade_id' =>
            $atividadeId,

        ':professor_id' =>
            $professorId
    ]);


    $atividade =
        $stmtAtividade->fetch();


    if (!$atividade) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Atividade não encontrada ou você não possui acesso.'
            ],
            404
        );
    }


    $turmaId =
        (int) $atividade['turma_id'];


    /*====================================================
                ALUNOS + ENTREGAS
    ====================================================*/

    $stmtEntregas =
        $pdo->prepare(
            "SELECT

                m.id AS matricula_id,

                a.id AS aluno_id,
                a.matricula AS numero_matricula,

                pe.id AS pessoa_id,
                pe.nome AS aluno_nome,

                ea.id AS entrega_id,
                ea.status AS entrega_status,
                ea.conteudo AS entrega_conteudo,
                ea.link_resposta AS entrega_link,

                ea.rascunho_salvo_em,
                ea.entregue_em,
                ea.retirada_em,
                ea.devolvida_em,
                ea.corrigida_em,
                ea.correcao_publicada_em,
                ea.feedback,
                ea.ultima_versao,

                v.id AS versao_id,
                v.numero_versao,
                v.conteudo AS versao_conteudo,
                v.link_resposta AS versao_link,
                v.status AS versao_status,
                v.salva_em AS versao_salva_em,
                v.enviada_em AS versao_enviada_em,

                av.id AS avaliacao_id,
                av.valor_maximo,

                n.valor AS nota_valor,
                n.observacao AS nota_observacao

             FROM matriculas m

             INNER JOIN alunos a
                ON a.id =
                   m.aluno_id

             INNER JOIN pessoas pe
                ON pe.id =
                   a.pessoa_id

             LEFT JOIN entregas_atividades ea
                ON ea.matricula_id =
                   m.id

                AND
                ea.atividade_id =
                   :atividade_id

             LEFT JOIN entrega_atividade_versoes v

                ON v.id = (

                    SELECT
                        v2.id

                    FROM entrega_atividade_versoes v2

                    WHERE
                        v2.entrega_id =
                        ea.id

                    ORDER BY
                        v2.numero_versao DESC,
                        v2.id DESC

                    LIMIT 1
                )

             LEFT JOIN avaliacoes av

                ON av.id = (

                    SELECT
                        MAX(av2.id)

                    FROM avaliacoes av2

                    WHERE
                        av2.atividade_id =
                        :atividade_id_avaliacao

                        AND
                        av2.status <>
                        'Cancelada'
                )

             LEFT JOIN notas n
                ON n.avaliacao_id =
                   av.id

                AND
                n.matricula_id =
                   m.id

             WHERE
                m.turma_id =
                :turma_id

                AND
                m.situacao =
                'Ativa'

             ORDER BY
                pe.nome ASC"
        );


    $stmtEntregas->execute([
        ':atividade_id' =>
            $atividadeId,

        ':atividade_id_avaliacao' =>
            $atividadeId,

        ':turma_id' =>
            $turmaId
    ]);


    $linhas =
        $stmtEntregas->fetchAll();


    /*====================================================
                ARQUIVOS DAS VERSÕES
    ====================================================*/

    $arquivosPorVersao =
        [];


    $versoesIds =
        [];


    foreach ($linhas as $linha) {

        if (
            $linha['versao_id']
            !== null
        ) {

            $versoesIds[] =
                (int) $linha[
                    'versao_id'
                ];
        }
    }


    $versoesIds =
        array_values(
            array_unique(
                $versoesIds
            )
        );


    if ($versoesIds !== []) {

        $placeholders =
            implode(
                ',',
                array_fill(
                    0,
                    count($versoesIds),
                    '?'
                )
            );


        $stmtArquivos =
            $pdo->prepare(
                "SELECT
                    id,
                    versao_id,
                    nome_original,
                    mime_type,
                    tamanho_bytes,
                    criado_em

                 FROM entrega_atividade_arquivos

                 WHERE
                    versao_id IN (
                        {$placeholders}
                    )

                 ORDER BY
                    id ASC"
            );


        $stmtArquivos->execute(
            $versoesIds
        );


        foreach (
            $stmtArquivos->fetchAll()
            as $arquivo
        ) {

            $versaoId =
                (int) $arquivo[
                    'versao_id'
                ];


            if (
                !isset(
                    $arquivosPorVersao[
                        $versaoId
                    ]
                )
            ) {

                $arquivosPorVersao[
                    $versaoId
                ] = [];
            }


            $arquivosPorVersao[
                $versaoId
            ][] = [

                'id' =>
                    (int) $arquivo[
                        'id'
                    ],

                'name' =>
                    (string) $arquivo[
                        'nome_original'
                    ],

                'mimeType' =>
                    (string) $arquivo[
                        'mime_type'
                    ],

                'sizeBytes' =>
                    (int) $arquivo[
                        'tamanho_bytes'
                    ],

                'createdAt' =>
                    $arquivo[
                        'criado_em'
                    ]
            ];
        }
    }


    /*====================================================
                MONTAR ENTREGAS
    ====================================================*/

    $entregas =
        [];


    $resumo = [

        'students' =>
            count($linhas),

        'submitted' =>
            0,

        'pending' =>
            0,

        'corrected' =>
            0
    ];


    foreach ($linhas as $linha) {

        $status =
            $linha['entrega_status']
            !== null

                ? (string) $linha[
                    'entrega_status'
                ]

                : 'Pendente';


        $versaoId =
            $linha['versao_id']
            !== null

                ? (int) $linha[
                    'versao_id'
                ]

                : null;


        $conteudo =
            $linha[
                'versao_conteudo'
            ] !== null

                ? (string) $linha[
                    'versao_conteudo'
                ]

                : (string) (
                    $linha[
                        'entrega_conteudo'
                    ] ?? ''
                );


        $link =
            $linha[
                'versao_link'
            ] !== null

                ? (string) $linha[
                    'versao_link'
                ]

                : (string) (
                    $linha[
                        'entrega_link'
                    ] ?? ''
                );


        $arquivos =
            $versaoId !== null

                ? (
                    $arquivosPorVersao[
                        $versaoId
                    ] ?? []
                )

                : [];


        /*============================================
                    RESUMO
        ============================================*/

        if (
            in_array(
                $status,
                [
                    'Entregue',
                    'Atrasada',
                    'Reenviada',
                    'Corrigida'
                ],
                true
            )
        ) {

            $resumo[
                'submitted'
            ]++;

        } else {

            $resumo[
                'pending'
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


        /*============================================
                    ENTREGA
        ============================================*/

        $entregas[] = [

            'student' => [

                'id' =>
                    (int) $linha[
                        'aluno_id'
                    ],

                'name' =>
                    (string) $linha[
                        'aluno_nome'
                    ],

                'registration' =>
                    (string) (
                        $linha[
                            'numero_matricula'
                        ] ?? ''
                    ),

                'enrollmentId' =>
                    (int) $linha[
                        'matricula_id'
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
                    $status,

                'content' =>
                    $conteudo,

                'link' =>
                    $link,

                'draftSavedAt' =>
                    $linha[
                        'rascunho_salvo_em'
                    ],

                'submittedAt' =>
                    $linha[
                        'entregue_em'
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

                'feedback' =>
                    (string) (
                        $linha[
                            'feedback'
                        ] ?? ''
                    ),

                'version' =>
                    $linha[
                        'numero_versao'
                    ] !== null

                        ? (int) $linha[
                            'numero_versao'
                        ]

                        : 0,

                'files' =>
                    $arquivos
            ],


            'grade' => [

                'evaluationId' =>
                    $linha[
                        'avaliacao_id'
                    ] !== null

                        ? (int) $linha[
                            'avaliacao_id'
                        ]

                        : null,

                'value' =>
                    $linha[
                        'nota_valor'
                    ] !== null

                        ? (float) $linha[
                            'nota_valor'
                        ]

                        : null,

                'maximum' =>
                    $linha[
                        'valor_maximo'
                    ] !== null

                        ? (float) $linha[
                            'valor_maximo'
                        ]

                        : 10,

                'observation' =>
                    (string) (
                        $linha[
                            'nota_observacao'
                        ] ?? ''
                    )
            ]
        ];
    }


    /*====================================================
                    RESPOSTA
    ====================================================*/

    primewayResponderJson(
        [
            'success' =>
                true,

            'activity' => [

                'id' =>
                    (int) $atividade[
                        'id'
                    ],

                'title' =>
                    (string) $atividade[
                        'titulo'
                    ],

                'description' =>
                    (string) (
                        $atividade[
                            'descricao'
                        ] ?? ''
                    ),

                'instructions' =>
                    (string) (
                        $atividade[
                            'instrucoes'
                        ] ?? ''
                    ),

                'submissionType' =>
                    (string) $atividade[
                        'tipo_entrega'
                    ],

                'publishedAt' =>
                    $atividade[
                        'data_publicacao'
                    ],

                'dueAt' =>
                    $atividade[
                        'data_entrega'
                    ],

                'status' =>
                    (string) $atividade[
                        'status'
                    ],

                'class' => [

                    'id' =>
                        (int) $atividade[
                            'turma_id'
                        ],

                    'name' =>
                        (string) $atividade[
                            'turma_nome'
                        ],

                    'series' =>
                        (string) $atividade[
                            'serie'
                        ],

                    'shift' =>
                        (string) $atividade[
                            'turno'
                        ]
                ],

                'subject' => [

                    'id' =>
                        (int) $atividade[
                            'disciplina_id'
                        ],

                    'code' =>
                        (string) $atividade[
                            'disciplina_codigo'
                        ],

                    'name' =>
                        (string) $atividade[
                            'disciplina_nome'
                        ]
                ],

                'period' => [

                    'id' =>
                        (int) $atividade[
                            'periodo_id'
                        ],

                    'name' =>
                        (string) $atividade[
                            'periodo_nome'
                        ]
                ]
            ],

            'summary' =>
                $resumo,

            'submissions' =>
                $entregas,

            'csrfToken' =>
                primewayTokenCsrf()
        ]
    );


} catch (Throwable $erro) {

    error_log(
        'PrimeWay Professor Entregas GET: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar as entregas da atividade.'
        ],
        500
    );
}
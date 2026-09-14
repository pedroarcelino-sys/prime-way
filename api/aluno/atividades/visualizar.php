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


$atividadeId =
    primewayIdPositivo(
        $_GET[
            'id'
        ] ?? null
    );


if (
    $atividadeId === null
) {

    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Atividade inválida.'
        ],
        400
    );
}


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


    if (
        $matricula === null
    ) {

        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'O aluno não possui matrícula ativa no ano letivo atual.'
            ],
            409
        );
    }


    /*====================================================
                    ATIVIDADE
    ====================================================*/

    $stmt =
        $pdo->prepare(
            "SELECT

                atv.id,
                atv.titulo,
                atv.descricao,
                atv.instrucoes,
                atv.tipo_entrega,
                atv.data_publicacao,
                atv.data_entrega,
                atv.status AS atividade_status,

                atv.permite_atraso,
                atv.permite_reenvio,
                atv.permite_comentarios,
                atv.max_arquivos,
                atv.tamanho_maximo_arquivo_mb,

                d.id AS disciplina_id,
                d.codigo AS disciplina_codigo,
                d.nome AS disciplina_nome,
                d.area AS disciplina_area,

                pl.id AS periodo_id,
                pl.nome AS periodo_nome,

                p.id AS professor_id,
                pp.nome AS professor_nome,

                ea.id AS entrega_id,
                ea.conteudo AS entrega_conteudo,
                ea.link_resposta AS entrega_link,
                ea.status AS entrega_status,
                ea.rascunho_salvo_em,
                ea.entregue_em,
                ea.retirada_em,
                ea.devolvida_em,
                ea.corrigida_em,
                ea.feedback,
                ea.correcao_publicada_em,
                ea.ultima_versao,

                av.id AS avaliacao_id,
                av.titulo AS avaliacao_titulo,
                av.tipo AS avaliacao_tipo,
                av.valor_maximo,
                av.peso,

                n.valor AS nota_valor,
                n.observacao AS nota_observacao,
                n.lancada_em AS nota_lancada_em,

                CASE
                    WHEN
                        atv.data_entrega IS NOT NULL
                        AND
                        atv.data_entrega < NOW()
                    THEN 1
                    ELSE 0
                END AS prazo_encerrado


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

                atv.id =
                :atividade_id

                AND
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

             LIMIT 1"
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

        ':atividade_id' =>
            $atividadeId,

        ':turma_id' =>
            (int) $matricula[
                'classId'
            ]
    ]);


    $linha =
        $stmt->fetch();


    if (
        !$linha
    ) {

        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'Atividade não encontrada ou não disponível para este aluno.'
            ],
            404
        );
    }


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


    /*====================================================
                ANEXOS DO PROFESSOR
    ====================================================*/

    $stmtAnexos =
        $pdo->prepare(
            "SELECT
                id,
                nome_original,
                mime_type,
                tamanho_bytes,
                criado_em

             FROM atividade_anexos

             WHERE
                atividade_id =
                :atividade_id

             ORDER BY
                id ASC"
        );


    $stmtAnexos->execute([
        ':atividade_id' =>
            $atividadeId
    ]);


    $anexos =
        array_map(

            static fn(
                array $item
            ): array => [

                'id' =>
                    (int) $item[
                        'id'
                    ],

                'name' =>
                    (string) $item[
                        'nome_original'
                    ],

                'mimeType' =>
                    (string) $item[
                        'mime_type'
                    ],

                'sizeBytes' =>
                    (int) $item[
                        'tamanho_bytes'
                    ],

                'createdAt' =>
                    (string) $item[
                        'criado_em'
                    ]
            ],

            $stmtAnexos->fetchAll()
        );


    /*====================================================
                    ENTREGA
    ====================================================*/

    $entregaId =
        $linha[
            'entrega_id'
        ] !== null

            ? (int) $linha[
                'entrega_id'
            ]

            : null;


    $versaoAtual =
        null;

    $arquivosEntrega =
        [];

    $historicoVersoes =
        [];

    $comentarios =
        [];

    $arquivosCorrecao =
        [];


    if (
        $entregaId !== null
    ) {

        /*================================================
                    VERSÕES
        ================================================*/

        $stmtVersoes =
            $pdo->prepare(
                "SELECT
                    id,
                    numero_versao,
                    conteudo,
                    link_resposta,
                    status,
                    salva_em,
                    enviada_em,
                    retirada_em

                 FROM entrega_atividade_versoes

                 WHERE
                    entrega_id =
                    :entrega_id

                 ORDER BY
                    numero_versao DESC"
            );


        $stmtVersoes->execute([
            ':entrega_id' =>
                $entregaId
        ]);


        $versoes =
            $stmtVersoes->fetchAll();


        if (
            $versoes !== []
        ) {

            $atual =
                $versoes[0];


            $versaoAtual = [

                'id' =>
                    (int) $atual[
                        'id'
                    ],

                'number' =>
                    (int) $atual[
                        'numero_versao'
                    ],

                'content' =>
                    (string) (
                        $atual[
                            'conteudo'
                        ] ?? ''
                    ),

                'link' =>
                    (string) (
                        $atual[
                            'link_resposta'
                        ] ?? ''
                    ),

                'status' =>
                    (string) $atual[
                        'status'
                    ],

                'savedAt' =>
                    $atual[
                        'salva_em'
                    ],

                'submittedAt' =>
                    $atual[
                        'enviada_em'
                    ],

                'withdrawnAt' =>
                    $atual[
                        'retirada_em'
                    ]
            ];


            /*============================================
                    ARQUIVOS DA VERSÃO
            ============================================*/

            $stmtArquivosEntrega =
                $pdo->prepare(
                    "SELECT
                        id,
                        nome_original,
                        mime_type,
                        tamanho_bytes,
                        criado_em

                     FROM entrega_atividade_arquivos

                     WHERE
                        versao_id =
                        :versao_id

                     ORDER BY
                        id ASC"
                );


            $stmtArquivosEntrega->execute([
                ':versao_id' =>
                    (int) $atual[
                        'id'
                    ]
            ]);


            $arquivosEntrega =
                array_map(

                    static fn(
                        array $item
                    ): array => [

                        'id' =>
                            (int) $item[
                                'id'
                            ],

                        'name' =>
                            (string) $item[
                                'nome_original'
                            ],

                        'mimeType' =>
                            (string) $item[
                                'mime_type'
                            ],

                        'sizeBytes' =>
                            (int) $item[
                                'tamanho_bytes'
                            ],

                        'createdAt' =>
                            (string) $item[
                                'criado_em'
                            ]
                    ],

                    $stmtArquivosEntrega
                        ->fetchAll()
                );
        }


        $historicoVersoes =
            array_map(

                static fn(
                    array $versao
                ): array => [

                    'id' =>
                        (int) $versao[
                            'id'
                        ],

                    'number' =>
                        (int) $versao[
                            'numero_versao'
                        ],

                    'status' =>
                        (string) $versao[
                            'status'
                        ],

                    'savedAt' =>
                        $versao[
                            'salva_em'
                        ],

                    'submittedAt' =>
                        $versao[
                            'enviada_em'
                        ],

                    'withdrawnAt' =>
                        $versao[
                            'retirada_em'
                        ]
                ],

                $versoes
            );


        /*================================================
                    COMENTÁRIOS
        ================================================*/

        $stmtComentarios =
            $pdo->prepare(
                "SELECT
                    c.id,
                    c.comentario,
                    c.criado_em,
                    c.editado_em,

                    u.id AS usuario_id,
                    u.perfil,

                    COALESCE(
                        pe.nome,
                        u.nome,
                        u.email
                    ) AS autor_nome

                 FROM atividade_comentarios c

                 INNER JOIN usuarios u
                    ON u.id =
                       c.usuario_id

                 LEFT JOIN pessoas pe
                    ON pe.id =
                       u.pessoa_id

                 WHERE
                    c.entrega_id =
                    :entrega_id

                    AND
                    c.excluido_em IS NULL

                 ORDER BY
                    c.criado_em ASC,
                    c.id ASC"
            );


        $stmtComentarios->execute([
            ':entrega_id' =>
                $entregaId
        ]);


        $comentarios =
            array_map(

                static fn(
                    array $comentario
                ): array => [

                    'id' =>
                        (int) $comentario[
                            'id'
                        ],

                    'author' => [

                        'id' =>
                            (int) $comentario[
                                'usuario_id'
                            ],

                        'name' =>
                            (string) $comentario[
                                'autor_nome'
                            ],

                        'role' =>
                            (string) $comentario[
                                'perfil'
                            ]
                    ],

                    'text' =>
                        (string) $comentario[
                            'comentario'
                        ],

                    'createdAt' =>
                        (string) $comentario[
                            'criado_em'
                        ],

                    'editedAt' =>
                        $comentario[
                            'editado_em'
                        ]
                ],

                $stmtComentarios
                    ->fetchAll()
            );


        /*================================================
                ARQUIVOS DE CORREÇÃO
        ================================================*/

        if (
            $correcaoPublicada
        ) {

            $stmtCorrecao =
                $pdo->prepare(
                    "SELECT
                        id,
                        nome_original,
                        mime_type,
                        tamanho_bytes,
                        criado_em

                     FROM entrega_correcao_arquivos

                     WHERE
                        entrega_id =
                        :entrega_id

                     ORDER BY
                        id ASC"
                );


            $stmtCorrecao->execute([
                ':entrega_id' =>
                    $entregaId
            ]);


            $arquivosCorrecao =
                array_map(

                    static fn(
                        array $item
                    ): array => [

                        'id' =>
                            (int) $item[
                                'id'
                            ],

                        'name' =>
                            (string) $item[
                                'nome_original'
                            ],

                        'mimeType' =>
                            (string) $item[
                                'mime_type'
                            ],

                        'sizeBytes' =>
                            (int) $item[
                                'tamanho_bytes'
                            ],

                        'createdAt' =>
                            (string) $item[
                                'criado_em'
                            ]
                    ],

                    $stmtCorrecao
                        ->fetchAll()
                );
        }
    }


    /*====================================================
                    NOTA
    ====================================================*/

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


        'enrollment' =>
            $matricula,


        'activity' => [

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

            'instructions' =>
                (string) (
                    $linha[
                        'instrucoes'
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
                    ],

                'area' =>
                    (string) $linha[
                        'disciplina_area'
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


            'attachments' =>
                $anexos
        ],


        'submission' => [

            'id' =>
                $entregaId,

            'status' =>
                primewayStatusEntregaAluno(
                    $statusEntrega,
                    $prazoEncerrado
                ),

            'databaseStatus' =>
                $statusEntrega,

            'content' =>
                $versaoAtual !== null

                    ? $versaoAtual[
                        'content'
                    ]

                    : (string) (
                        $linha[
                            'entrega_conteudo'
                        ] ?? ''
                    ),

            'link' =>
                $versaoAtual !== null

                    ? $versaoAtual[
                        'link'
                    ]

                    : (string) (
                        $linha[
                            'entrega_link'
                        ] ?? ''
                    ),

            'draftSavedAt' =>
                $linha[
                    'rascunho_salvo_em'
                ],

            'submittedAt' =>
                $linha[
                    'entregue_em'
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

            'currentVersion' =>
                $versaoAtual,

            'files' =>
                $arquivosEntrega,

            'versionHistory' =>
                $historicoVersoes
        ],


        'correction' => [

            'published' =>
                $correcaoPublicada,

            'feedback' =>
                $correcaoPublicada

                    ? (string) (
                        $linha[
                            'feedback'
                        ] ?? ''
                    )

                    : '',

            'files' =>
                $arquivosCorrecao
        ],


        'grade' => [

            'published' =>
                $correcaoPublicada,

            'evaluationId' =>
                $linha[
                    'avaliacao_id'
                ] !== null

                    ? (int) $linha[
                        'avaliacao_id'
                    ]

                    : null,

            'title' =>
                $linha[
                    'avaliacao_titulo'
                ] !== null

                    ? (string) $linha[
                        'avaliacao_titulo'
                    ]

                    : '',

            'type' =>
                $linha[
                    'avaliacao_tipo'
                ] !== null

                    ? (string) $linha[
                        'avaliacao_tipo'
                    ]

                    : '',

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

                    : null,

            'observation' =>
                $notaVisivel

                    ? (string) (
                        $linha[
                            'nota_observacao'
                        ] ?? ''
                    )

                    : '',

            'launchedAt' =>
                $notaVisivel

                    ? $linha[
                        'nota_lancada_em'
                    ]

                    : null
        ],


        'comments' =>
            $comentarios,


        'permissions' =>
            primewayPermissoesAtividadeAluno(
                $linha
            ),


        'csrfToken' =>
            primewayTokenCsrf()
    ]);


} catch (
    Throwable $erro
) {

    error_log(
        'PrimeWay Aluno Atividade Visualizar GET: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível carregar a atividade.'
        ],
        500
    );
}
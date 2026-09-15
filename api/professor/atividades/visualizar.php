<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';


primewayExigirMetodo(
    'GET'
);


$usuario =
    primewayExigirPerfis([
        'professor'
    ]);


$atividadeId =
    primewayIdPositivo(
        $_GET['id'] ??
        null
    );


if ($atividadeId === null) {

    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Informe uma atividade válida.'
        ],
        422
    );
}


try {

    $pdo =
        primewayPdo();


    /*====================================================
                PROFESSOR LOGADO
    ====================================================*/

    $stmtProfessor =
        $pdo->prepare(
            "
                SELECT
                    pr.id AS professor_id,
                    pe.nome AS professor_nome

                FROM usuarios u

                INNER JOIN pessoas pe
                    ON pe.id = u.pessoa_id

                INNER JOIN professores pr
                    ON pr.pessoa_id = pe.id

                WHERE u.id = :usuario_id
                  AND u.perfil = 'professor'
                  AND u.ativo = 1

                LIMIT 1
            "
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
                'success' =>
                    false,

                'message' =>
                    'Professor não encontrado.'
            ],
            404
        );
    }


    $professorId =
        (int) $professor[
            'professor_id'
        ];


    /*====================================================
                    ATIVIDADE
    ====================================================*/

    $stmtAtividade =
        $pdo->prepare(
            "
                SELECT
                    atv.id,
                    atv.titulo,
                    atv.descricao,
                    atv.instrucoes,
                    atv.tipo_entrega,
                    atv.data_publicacao,
                    atv.data_entrega,
                    atv.status,

                    atv.permite_atraso,
                    atv.permite_reenvio,
                    atv.permite_comentarios,
                    atv.max_arquivos,
                    atv.tamanho_maximo_arquivo_mb,

                    atv.criado_em,
                    atv.atualizado_em,

                    td.id AS turma_disciplina_id,

                    t.id AS turma_id,
                    t.nome AS turma_nome,
                    t.serie,
                    t.turno,
                    t.sala,

                    d.id AS disciplina_id,
                    d.nome AS disciplina_nome,
                    d.codigo AS disciplina_codigo,

                    pl.id AS periodo_id,
                    pl.nome AS periodo_nome,
                    pl.ordem AS periodo_ordem

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

                WHERE atv.id =
                    :atividade_id

                  AND td.professor_id =
                    :professor_id

                LIMIT 1
            "
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
                'success' =>
                    false,

                'message' =>
                    'Atividade não encontrada.'
            ],
            404
        );
    }


    /*====================================================
                TOTAL DE ALUNOS
    ====================================================*/

    $stmtAlunos =
        $pdo->prepare(
            "
                SELECT
                    COUNT(*)

                FROM matriculas

                WHERE turma_id =
                    :turma_id

                  AND situacao =
                    'Ativa'
            "
        );


    $stmtAlunos->execute([
        ':turma_id' =>
            (int) $atividade[
                'turma_id'
            ]
    ]);


    $totalAlunos =
        (int) $stmtAlunos
            ->fetchColumn();


    /*====================================================
                RESUMO DE ENTREGAS
    ====================================================*/

    $stmtEntregas =
        $pdo->prepare(
            "
                SELECT
                    COUNT(*) AS total,

                    SUM(
                        CASE
                            WHEN status IN (
                                'Entregue',
                                'Atrasada',
                                'Reenviada',
                                'Corrigida'
                            )
                            THEN 1
                            ELSE 0
                        END
                    ) AS entregues,

                    SUM(
                        CASE
                            WHEN status = 'Corrigida'
                            THEN 1
                            ELSE 0
                        END
                    ) AS corrigidas

                FROM entregas_atividades

                WHERE atividade_id =
                    :atividade_id
            "
        );


    $stmtEntregas->execute([
        ':atividade_id' =>
            $atividadeId
    ]);


    $entregas =
        $stmtEntregas->fetch()
        ?: [];


    /*====================================================
                    RESPOSTA
    ====================================================*/

    primewayResponderJson([

        'success' =>
            true,

        'professor' => [

            'id' =>
                $professorId,

            'name' =>
                (string) $professor[
                    'professor_nome'
                ]
        ],

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

            'publishAt' =>
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

            'allowsLateSubmission' =>
                (int) $atividade[
                    'permite_atraso'
                ] === 1,

            'allowsResubmission' =>
                (int) $atividade[
                    'permite_reenvio'
                ] === 1,

            'allowsComments' =>
                (int) $atividade[
                    'permite_comentarios'
                ] === 1,

            'maxFiles' =>
                (int) $atividade[
                    'max_arquivos'
                ],

            'maxFileSizeMb' =>
                (int) $atividade[
                    'tamanho_maximo_arquivo_mb'
                ],

            'createdAt' =>
                (string) $atividade[
                    'criado_em'
                ],

            'updatedAt' =>
                (string) $atividade[
                    'atualizado_em'
                ],

            'classSubject' => [

                'id' =>
                    (int) $atividade[
                        'turma_disciplina_id'
                    ],

                'classId' =>
                    (int) $atividade[
                        'turma_id'
                    ],

                'className' =>
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
                    ],

                'room' =>
                    (string) (
                        $atividade[
                            'sala'
                        ] ?? ''
                    ),

                'subjectId' =>
                    (int) $atividade[
                        'disciplina_id'
                    ],

                'subjectName' =>
                    (string) $atividade[
                        'disciplina_nome'
                    ],

                'subjectCode' =>
                    (string) $atividade[
                        'disciplina_codigo'
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
                    ],

                'order' =>
                    (int) $atividade[
                        'periodo_ordem'
                    ]
            ],

            'submissions' => [

                'students' =>
                    $totalAlunos,

                'submitted' =>
                    (int) (
                        $entregas[
                            'entregues'
                        ] ?? 0
                    ),

                'corrected' =>
                    (int) (
                        $entregas[
                            'corrigidas'
                        ] ?? 0
                    )
            ]
        ],

        'csrfToken' =>
            primewayTokenCsrf()
    ]);


} catch (
    Throwable $erro
) {

    error_log(
        'PrimeWay Professor Atividade visualizar: ' .
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
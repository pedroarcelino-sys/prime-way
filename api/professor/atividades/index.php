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
                    pe.nome

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
                    ANO LETIVO
    ====================================================*/

    $stmtAno =
        $pdo->query(
            "
                SELECT
                    id,
                    ano

                FROM anos_letivos

                WHERE ativo = 1

                ORDER BY ano DESC

                LIMIT 1
            "
        );


    $ano =
        $stmtAno->fetch()
        ?: null;


    /*====================================================
                TURMAS / DISCIPLINAS
    ====================================================*/

    $vinculos =
        [];


    if ($ano !== null) {

        $stmtVinculos =
            $pdo->prepare(
                "
                    SELECT
                        td.id AS turma_disciplina_id,

                        t.id AS turma_id,
                        t.nome AS turma_nome,
                        t.serie,
                        t.turno,

                        d.id AS disciplina_id,
                        d.nome AS disciplina_nome,
                        d.codigo AS disciplina_codigo

                    FROM turma_disciplinas td

                    INNER JOIN turmas t
                        ON t.id = td.turma_id

                    INNER JOIN disciplinas d
                        ON d.id = td.disciplina_id

                    WHERE td.professor_id = :professor_id
                      AND td.status = 'Ativa'
                      AND t.status = 'Ativa'
                      AND d.status = 'Ativa'
                      AND t.ano_letivo_id = :ano_letivo_id

                    ORDER BY
                        t.nome ASC,
                        d.nome ASC
                "
            );


        $stmtVinculos->execute([
            ':professor_id' =>
                $professorId,

            ':ano_letivo_id' =>
                (int) $ano['id']
        ]);


        foreach (
            $stmtVinculos->fetchAll()
            as $linha
        ) {

            $vinculos[] = [

                'id' =>
                    (int) $linha[
                        'turma_disciplina_id'
                    ],

                'classId' =>
                    (int) $linha[
                        'turma_id'
                    ],

                'className' =>
                    (string) $linha[
                        'turma_nome'
                    ],

                'series' =>
                    (string) $linha[
                        'serie'
                    ],

                'shift' =>
                    (string) $linha[
                        'turno'
                    ],

                'subjectId' =>
                    (int) $linha[
                        'disciplina_id'
                    ],

                'subjectName' =>
                    (string) $linha[
                        'disciplina_nome'
                    ],

                'subjectCode' =>
                    (string) $linha[
                        'disciplina_codigo'
                    ]
            ];
        }
    }


    /*====================================================
                    PERÍODOS
    ====================================================*/

    $periodos =
        [];


    if ($ano !== null) {

        $stmtPeriodos =
            $pdo->prepare(
                "
                    SELECT
                        id,
                        nome,
                        ordem,
                        data_inicio,
                        data_fim

                    FROM periodos_letivos

                    WHERE ano_letivo_id =
                        :ano_letivo_id

                    ORDER BY ordem ASC
                "
            );


        $stmtPeriodos->execute([
            ':ano_letivo_id' =>
                (int) $ano['id']
        ]);


        foreach (
            $stmtPeriodos->fetchAll()
            as $linha
        ) {

            $periodos[] = [

                'id' =>
                    (int) $linha['id'],

                'name' =>
                    (string) $linha['nome'],

                'order' =>
                    (int) $linha['ordem'],

                'startDate' =>
                    (string) $linha[
                        'data_inicio'
                    ],

                'endDate' =>
                    (string) $linha[
                        'data_fim'
                    ]
            ];
        }
    }


    /*====================================================
                    ATIVIDADES
    ====================================================*/

    $stmtAtividades =
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

                    td.id AS turma_disciplina_id,

                    t.id AS turma_id,
                    t.nome AS turma_nome,

                    d.id AS disciplina_id,
                    d.nome AS disciplina_nome,

                    pl.id AS periodo_id,
                    pl.nome AS periodo_nome,

                    (
                        SELECT COUNT(*)

                        FROM entregas_atividades ea

                        WHERE ea.atividade_id =
                            atv.id
                    ) AS total_entregas,

                    (
                        SELECT COUNT(*)

                        FROM entregas_atividades ea

                        WHERE ea.atividade_id =
                            atv.id

                          AND ea.status IN (
                              'Entregue',
                              'Atrasada',
                              'Reenviada',
                              'Corrigida'
                          )
                    ) AS entregues,

                    (
                        SELECT COUNT(*)

                        FROM entregas_atividades ea

                        WHERE ea.atividade_id =
                            atv.id

                          AND ea.status =
                              'Corrigida'
                    ) AS corrigidas

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

                WHERE td.professor_id =
                    :professor_id

                ORDER BY
                    atv.criado_em DESC,
                    atv.id DESC
            "
        );


    $stmtAtividades->execute([
        ':professor_id' =>
            $professorId
    ]);


    $atividades =
        [];


    foreach (
        $stmtAtividades->fetchAll()
        as $linha
    ) {

        $atividades[] = [

            'id' =>
                (int) $linha['id'],

            'title' =>
                (string) $linha['titulo'],

            'description' =>
                (string) (
                    $linha['descricao']
                    ?? ''
                ),

            'instructions' =>
                (string) (
                    $linha['instrucoes']
                    ?? ''
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
                    'status'
                ],

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

            'classSubject' => [

                'id' =>
                    (int) $linha[
                        'turma_disciplina_id'
                    ],

                'classId' =>
                    (int) $linha[
                        'turma_id'
                    ],

                'className' =>
                    (string) $linha[
                        'turma_nome'
                    ],

                'subjectId' =>
                    (int) $linha[
                        'disciplina_id'
                    ],

                'subjectName' =>
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

            'submissions' => [

                'total' =>
                    (int) $linha[
                        'total_entregas'
                    ],

                'submitted' =>
                    (int) $linha[
                        'entregues'
                    ],

                'corrected' =>
                    (int) $linha[
                        'corrigidas'
                    ]
            ]
        ];
    }


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
                    'nome'
                ]
        ],

        'schoolYear' =>
            $ano === null

                ? null

                : [

                    'id' =>
                        (int) $ano['id'],

                    'year' =>
                        (int) $ano['ano']
                ],

        'classSubjects' =>
            $vinculos,

        'periods' =>
            $periodos,

        'activities' =>
            $atividades,

        'csrfToken' =>
            primewayTokenCsrf()
    ]);


} catch (
    Throwable $erro
) {

    error_log(
        'PrimeWay Professor Atividades GET: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível carregar as atividades do professor.'
        ],
        500
    );
}
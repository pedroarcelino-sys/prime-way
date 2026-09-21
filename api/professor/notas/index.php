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
                    ANO LETIVO ATIVO
    ====================================================*/

    $stmtAno =
        $pdo->query(
            "
                SELECT
                    id,
                    ano,
                    data_inicio,
                    data_fim

                FROM anos_letivos

                WHERE ativo = 1

                ORDER BY ano DESC

                LIMIT 1
            "
        );


    $ano =
        $stmtAno->fetch()
        ?: null;


    /*
        Se não existir ano letivo ativo, a API continua
        respondendo normalmente. A tela poderá mostrar
        um estado vazio sem provocar erro.
    */

    if ($ano === null) {

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
                null,

            'classSubjects' =>
                [],

            'periods' =>
                [],

            'evaluations' =>
                [],

            'studentsByClassSubject' =>
                new stdClass(),

            'gradesByEvaluation' =>
                new stdClass(),

            'csrfToken' =>
                primewayTokenCsrf()
        ]);
    }


    $anoId =
        (int) $ano['id'];


    /*====================================================
                TURMAS / DISCIPLINAS DO PROFESSOR
    ====================================================*/

    $stmtVinculos =
        $pdo->prepare(
            "
                SELECT
                    td.id AS turma_disciplina_id,

                    t.id AS turma_id,
                    t.nome AS turma_nome,
                    t.serie,
                    t.turno,
                    t.sala,

                    d.id AS disciplina_id,
                    d.codigo AS disciplina_codigo,
                    d.nome AS disciplina_nome,
                    d.area AS disciplina_area,

                    td.carga_horaria

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
            $anoId
    ]);


    $classSubjects =
        [];


    foreach (
        $stmtVinculos->fetchAll()
        as $linha
    ) {

        $classSubjects[] = [

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

            'room' =>
                (string) (
                    $linha[
                        'sala'
                    ]
                    ?? ''
                ),

            'subjectId' =>
                (int) $linha[
                    'disciplina_id'
                ],

            'subjectCode' =>
                (string) $linha[
                    'disciplina_codigo'
                ],

            'subjectName' =>
                (string) $linha[
                    'disciplina_nome'
                ],

            'subjectArea' =>
                (string) $linha[
                    'disciplina_area'
                ],

            'workload' =>
                (int) $linha[
                    'carga_horaria'
                ]
        ];
    }


    /*====================================================
                    PERÍODOS LETIVOS
    ====================================================*/

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
            $anoId
    ]);


    $periods =
        [];


    foreach (
        $stmtPeriodos->fetchAll()
        as $linha
    ) {

        $periods[] = [

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


    /*====================================================
                        AVALIAÇÕES
    ====================================================*/

    $stmtAvaliacoes =
        $pdo->prepare(
            "
                SELECT
                    av.id,
                    av.turma_disciplina_id,
                    av.periodo_letivo_id,
                    av.atividade_id,
                    av.titulo,
                    av.descricao,
                    av.tipo,
                    av.valor_maximo,
                    av.peso,
                    av.data_avaliacao,
                    av.status,
                    av.criado_em,
                    av.atualizado_em,

                    t.id AS turma_id,
                    t.nome AS turma_nome,

                    d.id AS disciplina_id,
                    d.nome AS disciplina_nome,

                    pl.nome AS periodo_nome,
                    pl.ordem AS periodo_ordem,

                    COUNT(DISTINCT m.id)
                        AS total_alunos,

                    COUNT(DISTINCT n.matricula_id)
                        AS notas_lancadas

                FROM avaliacoes av

                INNER JOIN turma_disciplinas td
                    ON td.id =
                       av.turma_disciplina_id

                INNER JOIN turmas t
                    ON t.id =
                       td.turma_id

                INNER JOIN disciplinas d
                    ON d.id =
                       td.disciplina_id

                INNER JOIN periodos_letivos pl
                    ON pl.id =
                       av.periodo_letivo_id

                LEFT JOIN matriculas m
                    ON m.turma_id = t.id
                   AND m.situacao = 'Ativa'

                LEFT JOIN notas n
                    ON n.avaliacao_id = av.id
                   AND n.matricula_id = m.id

                WHERE td.professor_id =
                    :professor_id

                  AND t.ano_letivo_id =
                    :ano_letivo_id

                GROUP BY
                    av.id,
                    av.turma_disciplina_id,
                    av.periodo_letivo_id,
                    av.atividade_id,
                    av.titulo,
                    av.descricao,
                    av.tipo,
                    av.valor_maximo,
                    av.peso,
                    av.data_avaliacao,
                    av.status,
                    av.criado_em,
                    av.atualizado_em,
                    t.id,
                    t.nome,
                    d.id,
                    d.nome,
                    pl.nome,
                    pl.ordem

                ORDER BY
                    pl.ordem ASC,
                    av.data_avaliacao IS NULL,
                    av.data_avaliacao DESC,
                    av.id DESC
            "
        );


    $stmtAvaliacoes->execute([
        ':professor_id' =>
            $professorId,

        ':ano_letivo_id' =>
            $anoId
    ]);


    $evaluations =
        [];


    foreach (
        $stmtAvaliacoes->fetchAll()
        as $linha
    ) {

        $totalStudents =
            (int) $linha[
                'total_alunos'
            ];


        $gradedStudents =
            (int) $linha[
                'notas_lancadas'
            ];


        $evaluations[] = [

            'id' =>
                (int) $linha['id'],

            'classSubjectId' =>
                (int) $linha[
                    'turma_disciplina_id'
                ],

            'periodId' =>
                (int) $linha[
                    'periodo_letivo_id'
                ],

            'activityId' =>
                $linha[
                    'atividade_id'
                ] === null
                    ? null
                    : (int) $linha[
                        'atividade_id'
                    ],

            'title' =>
                (string) $linha[
                    'titulo'
                ],

            'description' =>
                (string) (
                    $linha[
                        'descricao'
                    ]
                    ?? ''
                ),

            'type' =>
                (string) $linha[
                    'tipo'
                ],

            'maximumValue' =>
                (float) $linha[
                    'valor_maximo'
                ],

            'weight' =>
                (float) $linha[
                    'peso'
                ],

            'date' =>
                $linha[
                    'data_avaliacao'
                ],

            'status' =>
                (string) $linha[
                    'status'
                ],

            'class' => [

                'id' =>
                    (int) $linha[
                        'turma_id'
                    ],

                'name' =>
                    (string) $linha[
                        'turma_nome'
                    ]
            ],

            'subject' => [

                'id' =>
                    (int) $linha[
                        'disciplina_id'
                    ],

                'name' =>
                    (string) $linha[
                        'disciplina_nome'
                    ]
            ],

            'period' => [

                'id' =>
                    (int) $linha[
                        'periodo_letivo_id'
                    ],

                'name' =>
                    (string) $linha[
                        'periodo_nome'
                    ],

                'order' =>
                    (int) $linha[
                        'periodo_ordem'
                    ]
            ],

            'summary' => [

                'students' =>
                    $totalStudents,

                'graded' =>
                    $gradedStudents,

                'pending' =>
                    max(
                        0,
                        $totalStudents -
                        $gradedStudents
                    )
            ],

            'createdAt' =>
                (string) $linha[
                    'criado_em'
                ],

            'updatedAt' =>
                (string) $linha[
                    'atualizado_em'
                ]
        ];
    }


    /*====================================================
                ALUNOS POR TURMA / DISCIPLINA
    ====================================================*/

    /*
        Uma turma_disciplina aponta para uma turma.
        Portanto os alunos válidos para lançamento de nota
        são as matrículas ativas dessa turma no ano ativo.

        A chave do objeto é o ID de turma_disciplina.
    */

    $stmtAlunos =
        $pdo->prepare(
            "
                SELECT
                    td.id AS turma_disciplina_id,

                    m.id AS matricula_id,
                    m.numero_chamada,

                    a.id AS aluno_id,
                    a.matricula AS registro_aluno,

                    pe.nome AS aluno_nome

                FROM turma_disciplinas td

                INNER JOIN turmas t
                    ON t.id = td.turma_id

                INNER JOIN matriculas m
                    ON m.turma_id = t.id
                   AND m.situacao = 'Ativa'

                INNER JOIN alunos a
                    ON a.id = m.aluno_id

                INNER JOIN pessoas pe
                    ON pe.id = a.pessoa_id

                WHERE td.professor_id =
                    :professor_id

                  AND td.status = 'Ativa'
                  AND t.status = 'Ativa'
                  AND t.ano_letivo_id =
                    :ano_letivo_id

                ORDER BY
                    td.id ASC,
                    m.numero_chamada IS NULL,
                    m.numero_chamada ASC,
                    pe.nome ASC
            "
        );


    $stmtAlunos->execute([
        ':professor_id' =>
            $professorId,

        ':ano_letivo_id' =>
            $anoId
    ]);


    $studentsByClassSubject =
        [];


    foreach (
        $stmtAlunos->fetchAll()
        as $linha
    ) {

        $classSubjectId =
            (string) (
                (int) $linha[
                    'turma_disciplina_id'
                ]
            );


        if (
            !isset(
                $studentsByClassSubject[
                    $classSubjectId
                ]
            )
        ) {

            $studentsByClassSubject[
                $classSubjectId
            ] =
                [];
        }


        $studentsByClassSubject[
            $classSubjectId
        ][] = [

            'enrollmentId' =>
                (int) $linha[
                    'matricula_id'
                ],

            'studentId' =>
                (int) $linha[
                    'aluno_id'
                ],

            'name' =>
                (string) $linha[
                    'aluno_nome'
                ],

            'registration' =>
                (string) $linha[
                    'registro_aluno'
                ],

            'callNumber' =>
                $linha[
                    'numero_chamada'
                ] === null
                    ? null
                    : (int) $linha[
                        'numero_chamada'
                    ]
        ];
    }


    /*====================================================
                    NOTAS EXISTENTES
    ====================================================*/

    /*
        A consulta é limitada às avaliações pertencentes
        às turma_disciplinas do professor autenticado.

        Isso impede que um professor receba notas de outra
        turma ou de outro professor.
    */

    $stmtNotas =
        $pdo->prepare(
            "
                SELECT
                    n.id AS nota_id,
                    n.avaliacao_id,
                    n.matricula_id,
                    n.valor,
                    n.observacao,
                    n.lancada_em,
                    n.atualizado_em,

                    av.valor_maximo

                FROM notas n

                INNER JOIN avaliacoes av
                    ON av.id =
                       n.avaliacao_id

                INNER JOIN turma_disciplinas td
                    ON td.id =
                       av.turma_disciplina_id

                INNER JOIN turmas t
                    ON t.id =
                       td.turma_id

                INNER JOIN matriculas m
                    ON m.id =
                       n.matricula_id
                   AND m.turma_id =
                       t.id

                WHERE td.professor_id =
                    :professor_id

                  AND t.ano_letivo_id =
                    :ano_letivo_id

                ORDER BY
                    n.avaliacao_id ASC,
                    n.matricula_id ASC
            "
        );


    $stmtNotas->execute([
        ':professor_id' =>
            $professorId,

        ':ano_letivo_id' =>
            $anoId
    ]);


    $gradesByEvaluation =
        [];


    foreach (
        $stmtNotas->fetchAll()
        as $linha
    ) {

        $evaluationId =
            (string) (
                (int) $linha[
                    'avaliacao_id'
                ]
            );


        $enrollmentId =
            (string) (
                (int) $linha[
                    'matricula_id'
                ]
            );


        if (
            !isset(
                $gradesByEvaluation[
                    $evaluationId
                ]
            )
        ) {

            $gradesByEvaluation[
                $evaluationId
            ] =
                [];
        }


        $value =
            (float) $linha[
                'valor'
            ];


        $maximumValue =
            (float) $linha[
                'valor_maximo'
            ];


        $gradesByEvaluation[
            $evaluationId
        ][
            $enrollmentId
        ] = [

            'id' =>
                (int) $linha[
                    'nota_id'
                ],

            'evaluationId' =>
                (int) $linha[
                    'avaliacao_id'
                ],

            'enrollmentId' =>
                (int) $linha[
                    'matricula_id'
                ],

            'value' =>
                $value,

            'maximumValue' =>
                $maximumValue,

            'normalized' =>
                $maximumValue > 0

                    ? round(
                        (
                            $value /
                            $maximumValue
                        ) * 10,
                        1
                    )

                    : null,

            'observation' =>
                (string) (
                    $linha[
                        'observacao'
                    ]
                    ?? ''
                ),

            'launchedAt' =>
                (string) $linha[
                    'lancada_em'
                ],

            'updatedAt' =>
                (string) $linha[
                    'atualizado_em'
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

        'schoolYear' => [

            'id' =>
                $anoId,

            'year' =>
                (int) $ano[
                    'ano'
                ],

            'startDate' =>
                (string) $ano[
                    'data_inicio'
                ],

            'endDate' =>
                (string) $ano[
                    'data_fim'
                ]
        ],

        'classSubjects' =>
            $classSubjects,

        'periods' =>
            $periods,

        'evaluations' =>
            $evaluations,

        'studentsByClassSubject' =>
            $studentsByClassSubject === []

                ? new stdClass()

                : $studentsByClassSubject,

        'gradesByEvaluation' =>
            $gradesByEvaluation === []

                ? new stdClass()

                : $gradesByEvaluation,

        'csrfToken' =>
            primewayTokenCsrf()
    ]);


} catch (
    Throwable $erro
) {

    error_log(
        'PrimeWay Professor Notas GET: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível carregar as notas do professor.'
        ],
        500
    );
}

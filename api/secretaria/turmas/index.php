<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('GET');

primewayExigirPerfis([
    'secretaria'
]);

try {

    $pdo = primewayPdo();

    /*====================================================
                    ANO LETIVO ATIVO
    ====================================================*/

    $stmtAno = $pdo->query(
        "
            SELECT
                id,
                ano,
                data_inicio,
                data_fim

            FROM anos_letivos

            WHERE ativo = 1

            ORDER BY
                ano DESC,
                id DESC

            LIMIT 1
        "
    );

    $ano = $stmtAno->fetch() ?: null;

    $anoLetivoId =
        $ano !== null
            ? (int) $ano['id']
            : 0;

    /*====================================================
                        TURMAS
    ====================================================*/

    $stmt = $pdo->prepare(
        "
            SELECT
                t.id,
                t.nome,
                t.serie,
                t.turno,
                t.sala,
                t.capacidade,
                t.status,

                p.id AS professor_id,
                pp.nome AS professor_nome,

                COUNT(
                    DISTINCT CASE
                        WHEN m.situacao = 'Ativa'
                        THEN m.id
                    END
                ) AS student_count

            FROM turmas t

            LEFT JOIN professores p
                ON p.id = t.professor_id

            LEFT JOIN pessoas pp
                ON pp.id = p.pessoa_id

            LEFT JOIN matriculas m
                ON m.turma_id = t.id

            WHERE t.ano_letivo_id = :ano_letivo_id

            GROUP BY
                t.id,
                t.nome,
                t.serie,
                t.turno,
                t.sala,
                t.capacidade,
                t.status,
                p.id,
                pp.nome

            ORDER BY
                FIELD(
                    t.turno,
                    'Manhã',
                    'Tarde',
                    'Integral'
                ),
                t.nome ASC
        "
    );

    $stmt->execute([
        ':ano_letivo_id' =>
            $anoLetivoId
    ]);

    $classes = [];

    while ($row = $stmt->fetch()) {

        $classId =
            (int) $row['id'];

        $classes[$classId] = [
            'id' =>
                $classId,

            'name' =>
                (string) $row['nome'],

            'series' =>
                (string) $row['serie'],

            'shift' =>
                (string) $row['turno'],

            'room' =>
                (string) (
                    $row['sala']
                    ?? ''
                ),

            'capacity' =>
                (int) $row['capacidade'],

            'status' =>
                (string) $row['status'],

            'studentCount' =>
                (int) $row['student_count'],

            'mainTeacher' =>
                $row['professor_id'] === null
                    ? null
                    : [
                        'id' =>
                            (int) $row['professor_id'],

                        'name' =>
                            (string) (
                                $row['professor_nome']
                                ?? ''
                            )
                    ],

            'students' =>
                [],

            'subjects' =>
                []
        ];
    }

    /*====================================================
                    ALUNOS MATRICULADOS
    ====================================================*/

    if ($classes !== []) {

        $classIds =
            array_keys(
                $classes
            );

        $markers =
            implode(
                ',',
                array_fill(
                    0,
                    count($classIds),
                    '?'
                )
            );

        $stmtStudents =
            $pdo->prepare(
                "
                    SELECT
                        m.id AS matricula_id,
                        m.turma_id,
                        m.numero_chamada,
                        m.data_matricula,
                        m.situacao,

                        a.id AS aluno_id,
                        a.matricula,

                        pe.nome AS aluno_nome

                    FROM matriculas m

                    INNER JOIN alunos a
                        ON a.id = m.aluno_id

                    INNER JOIN pessoas pe
                        ON pe.id = a.pessoa_id

                    WHERE m.turma_id IN ($markers)
                      AND m.situacao = 'Ativa'

                    ORDER BY
                        m.turma_id ASC,
                        CASE
                            WHEN m.numero_chamada IS NULL
                            THEN 9999
                            ELSE m.numero_chamada
                        END ASC,
                        pe.nome ASC
                "
            );

        $stmtStudents->execute(
            array_values(
                $classIds
            )
        );

        foreach (
            $stmtStudents->fetchAll()
            as $row
        ) {

            $classId =
                (int) $row['turma_id'];

            if (
                !isset(
                    $classes[$classId]
                )
            ) {
                continue;
            }

            $classes[$classId]['students'][] = [
                'id' =>
                    (int) $row['aluno_id'],

                'name' =>
                    (string) $row['aluno_nome'],

                'registration' =>
                    (string) $row['matricula'],

                'callNumber' =>
                    $row['numero_chamada'] === null
                        ? null
                        : (int) $row['numero_chamada'],

                'enrollmentDate' =>
                    (string) $row['data_matricula']
            ];
        }

        /*================================================
                    DISCIPLINAS DA TURMA
        ================================================*/

        $stmtSubjects =
            $pdo->prepare(
                "
                    SELECT
                        td.id AS vínculo_id,
                        td.turma_id,
                        td.carga_horaria,
                        td.status AS vínculo_status,

                        d.id AS disciplina_id,
                        d.codigo AS disciplina_codigo,
                        d.nome AS disciplina_nome,
                        d.area AS disciplina_area,
                        d.status AS disciplina_status,

                        p.id AS professor_id,
                        pe.nome AS professor_nome

                    FROM turma_disciplinas td

                    INNER JOIN disciplinas d
                        ON d.id = td.disciplina_id

                    INNER JOIN professores p
                        ON p.id = td.professor_id

                    INNER JOIN pessoas pe
                        ON pe.id = p.pessoa_id

                    WHERE td.turma_id IN ($markers)

                    ORDER BY
                        td.turma_id ASC,
                        d.nome ASC,
                        pe.nome ASC
                "
            );

        $stmtSubjects->execute(
            array_values(
                $classIds
            )
        );

        foreach (
            $stmtSubjects->fetchAll()
            as $row
        ) {

            $classId =
                (int) $row['turma_id'];

            if (
                !isset(
                    $classes[$classId]
                )
            ) {
                continue;
            }

            $classes[$classId]['subjects'][] = [
                'linkId' =>
                    (int) $row['vínculo_id'],

                'id' =>
                    (int) $row['disciplina_id'],

                'code' =>
                    (string) $row['disciplina_codigo'],

                'name' =>
                    (string) $row['disciplina_nome'],

                'area' =>
                    (string) $row['disciplina_area'],

                'workload' =>
                    (int) $row['carga_horaria'],

                'status' =>
                    (string) $row['vínculo_status'],

                'subjectStatus' =>
                    (string) $row['disciplina_status'],

                'teacher' => [
                    'id' =>
                        (int) $row['professor_id'],

                    'name' =>
                        (string) $row['professor_nome']
                ]
            ];
        }
    }

    $classList =
        array_values(
            $classes
        );

    $summary = [
        'total' =>
            count(
                $classList
            ),

        'active' =>
            0,

        'students' =>
            0,

        'subjects' =>
            0,

        'withoutTeacher' =>
            0
    ];

    foreach (
        $classList
        as $class
    ) {

        if (
            $class['status']
            === 'Ativa'
        ) {
            $summary['active']++;
        }

        $summary['students'] +=
            $class['studentCount'];

        $summary['subjects'] +=
            count(
                array_filter(
                    $class['subjects'],
                    static fn (
                        array $subject
                    ): bool =>
                        $subject['status']
                        === 'Ativa'
                )
            );

        if (
            $class['mainTeacher']
            === null
        ) {
            $summary['withoutTeacher']++;
        }
    }

    primewayResponderJson([
        'success' =>
            true,

        'schoolYear' =>
            $ano === null
                ? null
                : [
                    'id' =>
                        (int) $ano['id'],

                    'year' =>
                        (int) $ano['ano'],

                    'startDate' =>
                        (string) $ano['data_inicio'],

                    'endDate' =>
                        (string) $ano['data_fim']
                ],

        'summary' =>
            $summary,

        'classes' =>
            $classList
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Secretaria Turmas GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            'Não foi possível carregar as turmas da Secretaria.'
    ], 500);
}

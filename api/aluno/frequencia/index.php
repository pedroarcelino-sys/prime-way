<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';

primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'aluno'
    ]);

try {

    $pdo =
        primewayPdo();

    $contexto =
        primewayAlunoContexto(
            $pdo,
            $usuario
        );

    $matricula =
        $contexto['enrollment'];

    if (!$matricula) {

        primewayResponderJson([
            'success' => true,
            'schoolYear' =>
                $contexto['schoolYear']['year']
                ?? null,
            'enrollment' => null,
            'subjects' => [],
            'history' => [],
            'summary' => [
                'records' => 0,
                'presences' => 0,
                'absences' => 0,
                'justified' => 0,
                'late' => 0,
                'percentage' => null
            ]
        ]);
    }

    $stmtSubjects =
        $pdo->prepare(
            "
                SELECT
                    td.id AS turma_disciplina_id,
                    d.id AS disciplina_id,
                    d.nome AS disciplina,

                    COUNT(f.id) AS registros,

                    SUM(
                        CASE
                            WHEN f.situacao = 'Presente'
                            THEN 1
                            ELSE 0
                        END
                    ) AS presencas,

                    SUM(
                        CASE
                            WHEN f.situacao = 'Falta'
                            THEN 1
                            ELSE 0
                        END
                    ) AS faltas,

                    SUM(
                        CASE
                            WHEN f.situacao = 'Justificada'
                            THEN 1
                            ELSE 0
                        END
                    ) AS justificadas,

                    SUM(
                        CASE
                            WHEN f.situacao = 'Atraso'
                            THEN 1
                            ELSE 0
                        END
                    ) AS atrasos

                FROM turma_disciplinas td

                INNER JOIN disciplinas d
                    ON d.id = td.disciplina_id

                LEFT JOIN aulas au
                    ON au.turma_disciplina_id = td.id
                   AND au.status = 'Realizada'

                LEFT JOIN frequencias f
                    ON f.aula_id = au.id
                   AND f.matricula_id = :matricula_id

                WHERE td.turma_id = :turma_id
                  AND td.status = 'Ativa'
                  AND d.status = 'Ativa'

                GROUP BY
                    td.id,
                    d.id,
                    d.nome

                ORDER BY d.nome ASC
            "
        );

    $stmtSubjects->execute([
        ':matricula_id' =>
            (int) $matricula['id'],

        ':turma_id' =>
            (int) $matricula['classId']
    ]);

    $subjects =
        [];

    $totalRecords =
        0;

    $totalPresences =
        0;

    $totalAbsences =
        0;

    $totalJustified =
        0;

    $totalLate =
        0;

    foreach (
        $stmtSubjects->fetchAll()
        as $row
    ) {

        $records =
            (int) $row['registros'];

        $presences =
            (int) $row['presencas'];

        $late =
            (int) $row['atrasos'];

        $percentage =
            $records > 0
                ? round(
                    (
                        ($presences + $late)
                        / $records
                    ) * 100
                )
                : null;

        $subjects[] = [
            'classSubjectId' =>
                (int) $row['turma_disciplina_id'],

            'subjectId' =>
                (int) $row['disciplina_id'],

            'subject' =>
                (string) $row['disciplina'],

            'records' =>
                $records,

            'presences' =>
                $presences,

            'absences' =>
                (int) $row['faltas'],

            'justified' =>
                (int) $row['justificadas'],

            'late' =>
                $late,

            'percentage' =>
                $percentage
        ];

        $totalRecords +=
            $records;

        $totalPresences +=
            $presences;

        $totalAbsences +=
            (int) $row['faltas'];

        $totalJustified +=
            (int) $row['justificadas'];

        $totalLate +=
            $late;
    }

    $stmtHistory =
        $pdo->prepare(
            "
                SELECT
                    au.id AS aula_id,
                    au.data_aula,
                    au.horario_inicio,
                    au.horario_fim,
                    au.conteudo,
                    f.situacao,
                    f.observacao,
                    d.id AS disciplina_id,
                    d.nome AS disciplina

                FROM frequencias f

                INNER JOIN aulas au
                    ON au.id = f.aula_id

                INNER JOIN turma_disciplinas td
                    ON td.id = au.turma_disciplina_id

                INNER JOIN disciplinas d
                    ON d.id = td.disciplina_id

                WHERE f.matricula_id =
                    :matricula_id

                ORDER BY
                    au.data_aula DESC,
                    au.horario_inicio DESC,
                    au.id DESC

                LIMIT 150
            "
        );

    $stmtHistory->execute([
        ':matricula_id' =>
            (int) $matricula['id']
    ]);

    $history =
        array_map(
            static fn (
                array $row
            ): array => [
                'lessonId' =>
                    (int) $row['aula_id'],

                'date' =>
                    (string) $row['data_aula'],

                'startTime' =>
                    $row['horario_inicio'],

                'endTime' =>
                    $row['horario_fim'],

                'content' =>
                    (string) (
                        $row['conteudo']
                        ?? ''
                    ),

                'status' =>
                    (string) $row['situacao'],

                'observation' =>
                    (string) (
                        $row['observacao']
                        ?? ''
                    ),

                'subjectId' =>
                    (int) $row['disciplina_id'],

                'subject' =>
                    (string) $row['disciplina']
            ],
            $stmtHistory->fetchAll()
        );

    $overall =
        $totalRecords > 0
            ? round(
                (
                    (
                        $totalPresences +
                        $totalLate
                    ) /
                    $totalRecords
                ) * 100
            )
            : null;

    primewayResponderJson([
        'success' => true,

        'schoolYear' =>
            $contexto['schoolYear']['year']
            ?? null,

        'enrollment' =>
            $matricula,

        'subjects' =>
            $subjects,

        'history' =>
            $history,

        'summary' => [
            'records' =>
                $totalRecords,

            'presences' =>
                $totalPresences,

            'absences' =>
                $totalAbsences,

            'justified' =>
                $totalJustified,

            'late' =>
                $totalLate,

            'percentage' =>
                $overall
        ]
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Aluno Frequência GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar a frequência.'
        ],
        500
    );
}

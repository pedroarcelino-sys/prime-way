<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';

primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'responsavel'
    ]);

try {

    $pdo =
        primewayPdo();

    $contexto =
        primewayResponsavelContexto(
            $pdo,
            $usuario
        );

    $studentId =
        primewayIdPositivo(
            $_GET['studentId']
            ?? null
        );

    $students =
        $contexto['students'];

    if ($studentId !== null) {
        $students = [
            primewayResponsavelExigirAluno(
                $contexto,
                $studentId
            )
        ];
    }

    $subjects =
        [];

    $history =
        [];

    foreach (
        $students
        as $student
    ) {

        if (
            $student['enrollment']
            === null
        ) {
            continue;
        }

        $matriculaId =
            (int) $student[
                'enrollment'
            ][
                'id'
            ];

        $turmaId =
            (int) $student[
                'enrollment'
            ][
                'classId'
            ];

        $stmtSubjects =
            $pdo->prepare(
                "
                    SELECT
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
                        ON d.id =
                           td.disciplina_id

                    LEFT JOIN aulas au
                        ON au.turma_disciplina_id =
                           td.id
                       AND au.status =
                           'Realizada'

                    LEFT JOIN frequencias f
                        ON f.aula_id =
                           au.id
                       AND f.matricula_id =
                           :matricula_id

                    WHERE td.turma_id =
                        :turma_id

                      AND td.status =
                        'Ativa'

                      AND d.status =
                        'Ativa'

                    GROUP BY
                        d.id,
                        d.nome

                    ORDER BY
                        d.nome ASC
                "
            );

        $stmtSubjects->execute([
            ':matricula_id' =>
                $matriculaId,

            ':turma_id' =>
                $turmaId
        ]);

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

            $subjects[] = [
                'studentId' =>
                    (int) $student['studentId'],

                'studentName' =>
                    (string) $student['name'],

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
                    $records > 0
                        ? round(
                            (
                                (
                                    $presences +
                                    $late
                                ) /
                                $records
                            ) * 100
                        )
                        : null
            ];
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
                        ON au.id =
                           f.aula_id

                    INNER JOIN turma_disciplinas td
                        ON td.id =
                           au.turma_disciplina_id

                    INNER JOIN disciplinas d
                        ON d.id =
                           td.disciplina_id

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
                $matriculaId
        ]);

        foreach (
            $stmtHistory->fetchAll()
            as $row
        ) {
            $history[] = [
                'studentId' =>
                    (int) $student['studentId'],

                'studentName' =>
                    (string) $student['name'],

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
            ];
        }
    }

    primewayResponderJson([
        'success' => true,
        'students' =>
            $contexto['students'],
        'subjects' =>
            $subjects,
        'history' =>
            $history
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Responsável Frequência GET: ' .
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

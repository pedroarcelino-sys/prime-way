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

    $students =
        [];

    foreach (
        $contexto['students']
        as $student
    ) {

        $average =
            null;

        $attendance =
            null;

        $upcomingActivities =
            0;

        if (
            $student['enrollment']
            !== null
        ) {

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

            $stmtMedia =
                $pdo->prepare(
                    "
                        SELECT
                            ROUND(
                                SUM(
                                    (
                                        n.valor /
                                        NULLIF(
                                            av.valor_maximo,
                                            0
                                        )
                                    ) * 10 * av.peso
                                )
                                /
                                NULLIF(
                                    SUM(av.peso),
                                    0
                                ),
                                1
                            )

                        FROM notas n

                        INNER JOIN avaliacoes av
                            ON av.id =
                               n.avaliacao_id

                        WHERE n.matricula_id =
                            :matricula_id

                          AND av.status <>
                            'Cancelada'
                    "
                );

            $stmtMedia->execute([
                ':matricula_id' =>
                    $matriculaId
            ]);

            $value =
                $stmtMedia->fetchColumn();

            $average =
                $value === false ||
                $value === null
                    ? null
                    : (float) $value;

            $stmtFreq =
                $pdo->prepare(
                    "
                        SELECT
                            ROUND(
                                100 *
                                SUM(
                                    CASE
                                        WHEN f.situacao IN (
                                            'Presente',
                                            'Atraso'
                                        )
                                        THEN 1
                                        ELSE 0
                                    END
                                )
                                /
                                NULLIF(
                                    COUNT(*),
                                    0
                                ),
                                0
                            )

                        FROM frequencias f

                        INNER JOIN aulas au
                            ON au.id =
                               f.aula_id

                        WHERE f.matricula_id =
                            :matricula_id

                          AND au.status =
                            'Realizada'
                    "
                );

            $stmtFreq->execute([
                ':matricula_id' =>
                    $matriculaId
            ]);

            $value =
                $stmtFreq->fetchColumn();

            $attendance =
                $value === false ||
                $value === null
                    ? null
                    : (int) $value;

            $stmtAtividades =
                $pdo->prepare(
                    "
                        SELECT COUNT(*)

                        FROM atividades atv

                        INNER JOIN turma_disciplinas td
                            ON td.id =
                               atv.turma_disciplina_id

                        WHERE td.turma_id =
                            :turma_id

                          AND atv.status =
                            'Publicada'

                          AND (
                                atv.data_entrega IS NULL
                                OR atv.data_entrega >= CURRENT_TIMESTAMP
                              )
                    "
                );

            $stmtAtividades->execute([
                ':turma_id' =>
                    $turmaId
            ]);

            $upcomingActivities =
                (int) $stmtAtividades->fetchColumn();
        }

        $student['average'] =
            $average;

        $student['attendance'] =
            $attendance;

        $student['upcomingActivities'] =
            $upcomingActivities;

        $students[] =
            $student;
    }

    primewayResponderJson([
        'success' => true,
        'schoolYear' =>
            $contexto['schoolYear'],
        'students' =>
            $students
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Responsável Alunos GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar os alunos vinculados.'
        ],
        500
    );
}

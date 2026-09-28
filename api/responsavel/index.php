<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/_contexto.php';

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

    $activitiesCount =
        0;

    foreach (
        $contexto['students']
        as $student
    ) {

        $average =
            null;

        $attendance =
            null;

        $upcoming =
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

            $stmtActivities =
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

            $stmtActivities->execute([
                ':turma_id' =>
                    $turmaId
            ]);

            $upcoming =
                (int) $stmtActivities->fetchColumn();
        }

        $activitiesCount +=
            $upcoming;

        $student['average'] =
            $average;

        $student['attendance'] =
            $attendance;

        $student['upcomingActivities'] =
            $upcoming;

        $students[] =
            $student;
    }

    $stmtEvents =
        $pdo->prepare(
            "
                SELECT DISTINCT
                    e.id,
                    e.titulo,
                    e.tipo,
                    e.data_evento,
                    e.horario_inicio,
                    e.local,
                    t.nome AS turma_nome

                FROM eventos_calendario e

                LEFT JOIN turmas t
                    ON t.id = e.turma_id

                WHERE e.status = 'Agendado'
                  AND e.data_evento >= CURRENT_DATE

                  AND (
                        e.turma_id IS NULL

                        OR EXISTS (
                            SELECT 1

                            FROM aluno_responsavel ar

                            INNER JOIN matriculas m
                                ON m.aluno_id = ar.aluno_id
                               AND m.situacao = 'Ativa'

                            WHERE ar.responsavel_id =
                                :responsavel_id

                              AND ar.ativo = 1
                              AND m.turma_id = e.turma_id
                        )
                      )

                ORDER BY
                    e.data_evento ASC,
                    e.horario_inicio ASC

                LIMIT 6
            "
        );

    $stmtEvents->execute([
        ':responsavel_id' =>
            (int) $contexto[
                'profile'
            ][
                'guardianId'
            ]
    ]);

    $events =
        array_map(
            static fn (
                array $row
            ): array => [
                'id' =>
                    (int) $row['id'],

                'title' =>
                    (string) $row['titulo'],

                'type' =>
                    (string) $row['tipo'],

                'date' =>
                    (string) $row['data_evento'],

                'time' =>
                    $row['horario_inicio'],

                'location' =>
                    (string) (
                        $row['local']
                        ?? ''
                    ),

                'className' =>
                    (string) (
                        $row['turma_nome']
                        ?? ''
                    )
            ],
            $stmtEvents->fetchAll()
        );

    $stmtNotices =
        $pdo->prepare(
            "
                SELECT
                    n.id,
                    n.titulo,
                    n.tipo,
                    n.mensagem,

                    COALESCE(
                        n.publicada_em,
                        n.criado_em
                    ) AS data_notificacao,

                    nd.lida_em

                FROM notificacoes n

                LEFT JOIN notificacao_destinatarios nd
                    ON nd.notificacao_id = n.id
                   AND nd.usuario_id = :usuario_id

                WHERE n.status = 'Publicada'

                  AND COALESCE(
                        n.publicada_em,
                        n.criado_em
                      ) <= CURRENT_TIMESTAMP

                  AND (
                        (
                            nd.id IS NOT NULL
                            AND nd.excluida_em IS NULL
                        )

                        OR

                        (
                            nd.id IS NULL
                            AND LOWER(n.publico) IN (
                                'todos',
                                'responsáveis',
                                'responsaveis',
                                'responsável',
                                'responsavel'
                            )
                        )
                      )

                ORDER BY
                    COALESCE(
                        n.publicada_em,
                        n.criado_em
                    ) DESC,
                    n.id DESC

                LIMIT 5
            "
        );

    $stmtNotices->execute([
        ':usuario_id' =>
            (int) $usuario['id']
    ]);

    $notices =
        array_map(
            static fn (
                array $row
            ): array => [
                'id' =>
                    (int) $row['id'],

                'title' =>
                    (string) $row['titulo'],

                'type' =>
                    (string) $row['tipo'],

                'message' =>
                    (string) $row['mensagem'],

                'date' =>
                    (string) $row['data_notificacao'],

                'read' =>
                    $row['lida_em'] !== null
            ],
            $stmtNotices->fetchAll()
        );

    primewayResponderJson([
        'success' => true,
        'profile' =>
            $contexto['profile'],
        'schoolYear' =>
            $contexto['schoolYear'],
        'students' =>
            $students,
        'events' =>
            $events,
        'notices' =>
            $notices,
        'summary' => [
            'students' =>
                count($students),
            'upcomingActivities' =>
                $activitiesCount,
            'events' =>
                count($events),
            'notices' =>
                count($notices)
        ]
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Portal Responsável GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar a área do responsável.'
        ],
        500
    );
}

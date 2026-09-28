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

    $activities =
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

        $stmt =
            $pdo->prepare(
                "
                    SELECT
                        atv.id,
                        atv.titulo,
                        atv.descricao,
                        atv.data_publicacao,
                        atv.data_entrega,
                        atv.status,

                        d.nome AS disciplina,

                        pl.nome AS periodo,

                        pe.nome AS professor,

                        ent.status AS entrega_status,
                        ent.entregue_em,
                        ent.corrigida_em,
                        ent.feedback

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

                    INNER JOIN professores pr
                        ON pr.id =
                           td.professor_id

                    INNER JOIN pessoas pe
                        ON pe.id =
                           pr.pessoa_id

                    LEFT JOIN entregas_atividades ent
                        ON ent.atividade_id =
                           atv.id
                       AND ent.matricula_id =
                           :matricula_id

                    WHERE td.turma_id =
                        :turma_id

                      AND atv.status IN (
                            'Publicada',
                            'Encerrada'
                          )

                    ORDER BY
                        COALESCE(
                            atv.data_entrega,
                            '9999-12-31 23:59:59'
                        ) ASC,
                        atv.data_publicacao DESC,
                        atv.id DESC
                "
            );

        $stmt->execute([
            ':matricula_id' =>
                (int) $student[
                    'enrollment'
                ][
                    'id'
                ],

            ':turma_id' =>
                (int) $student[
                    'enrollment'
                ][
                    'classId'
                ]
        ]);

        foreach (
            $stmt->fetchAll()
            as $row
        ) {

            $deliveryStatus =
                $row['entrega_status']
                ?? null;

            if (
                $deliveryStatus === null
                &&
                $row['data_entrega'] !== null
                &&
                strtotime(
                    (string) $row[
                        'data_entrega'
                    ]
                ) < time()
            ) {
                $deliveryStatus =
                    'Atrasada';
            }

            $activities[] = [
                'id' =>
                    (int) $row['id'],

                'studentId' =>
                    (int) $student['studentId'],

                'studentName' =>
                    (string) $student['name'],

                'title' =>
                    (string) $row['titulo'],

                'description' =>
                    (string) (
                        $row['descricao']
                        ?? ''
                    ),

                'subject' =>
                    (string) $row['disciplina'],

                'period' =>
                    (string) $row['periodo'],

                'teacher' =>
                    (string) $row['professor'],

                'publishedAt' =>
                    $row['data_publicacao'],

                'dueAt' =>
                    $row['data_entrega'],

                'activityStatus' =>
                    (string) $row['status'],

                'deliveryStatus' =>
                    $deliveryStatus
                    ?? 'Pendente',

                'submittedAt' =>
                    $row['entregue_em'],

                'correctedAt' =>
                    $row['corrigida_em'],

                'feedback' =>
                    (string) (
                        $row['feedback']
                        ?? ''
                    )
            ];
        }
    }

    primewayResponderJson([
        'success' => true,
        'students' =>
            $contexto['students'],
        'activities' =>
            $activities
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Responsável Atividades GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar as atividades.'
        ],
        500
    );
}

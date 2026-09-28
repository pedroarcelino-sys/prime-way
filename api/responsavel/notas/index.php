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

    $grades =
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
                        av.id,
                        av.titulo,
                        av.tipo,
                        av.valor_maximo,
                        av.peso,
                        av.data_avaliacao,
                        av.status,

                        d.nome AS disciplina,

                        pl.id AS periodo_id,
                        pl.nome AS periodo,

                        n.valor,
                        n.observacao,
                        n.lancada_em

                    FROM avaliacoes av

                    INNER JOIN turma_disciplinas td
                        ON td.id =
                           av.turma_disciplina_id

                    INNER JOIN disciplinas d
                        ON d.id =
                           td.disciplina_id

                    INNER JOIN periodos_letivos pl
                        ON pl.id =
                           av.periodo_letivo_id

                    LEFT JOIN notas n
                        ON n.avaliacao_id =
                           av.id
                       AND n.matricula_id =
                           :matricula_id

                    WHERE td.turma_id =
                        :turma_id

                      AND av.status <>
                        'Cancelada'

                    ORDER BY
                        pl.ordem DESC,
                        av.data_avaliacao DESC,
                        av.id DESC
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

            $value =
                $row['valor'] === null
                    ? null
                    : (float) $row['valor'];

            $maximum =
                (float) $row[
                    'valor_maximo'
                ];

            $grades[] = [
                'id' =>
                    (int) $row['id'],

                'studentId' =>
                    (int) $student['studentId'],

                'studentName' =>
                    (string) $student['name'],

                'title' =>
                    (string) $row['titulo'],

                'type' =>
                    (string) $row['tipo'],

                'subject' =>
                    (string) $row['disciplina'],

                'periodId' =>
                    (int) $row['periodo_id'],

                'period' =>
                    (string) $row['periodo'],

                'date' =>
                    $row['data_avaliacao'],

                'status' =>
                    (string) $row['status'],

                'value' =>
                    $value,

                'maximum' =>
                    $maximum,

                'weight' =>
                    (float) $row['peso'],

                'normalized' =>
                    $value === null ||
                    $maximum <= 0
                        ? null
                        : round(
                            (
                                $value /
                                $maximum
                            ) * 10,
                            1
                        ),

                'observation' =>
                    (string) (
                        $row['observacao']
                        ?? ''
                    ),

                'launchedAt' =>
                    $row['lancada_em']
            ];
        }
    }

    primewayResponderJson([
        'success' => true,
        'students' =>
            $contexto['students'],
        'grades' =>
            $grades
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Responsável Notas GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar as notas.'
        ],
        500
    );
}

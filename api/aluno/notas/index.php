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
            'periods' => [],
            'grades' => [],
            'summary' => [
                'average' => null,
                'graded' => 0,
                'pending' => 0,
                'subjects' => 0
            ]
        ]);
    }

    $stmt =
        $pdo->prepare(
            "
                SELECT
                    av.id,
                    av.titulo,
                    av.descricao,
                    av.tipo,
                    av.valor_maximo,
                    av.peso,
                    av.data_avaliacao,
                    av.status,

                    d.id AS disciplina_id,
                    d.nome AS disciplina,

                    pl.id AS periodo_id,
                    pl.nome AS periodo,

                    n.valor,
                    n.observacao,
                    n.lancada_em

                FROM avaliacoes av

                INNER JOIN turma_disciplinas td
                    ON td.id = av.turma_disciplina_id

                INNER JOIN disciplinas d
                    ON d.id = td.disciplina_id

                INNER JOIN periodos_letivos pl
                    ON pl.id = av.periodo_letivo_id

                LEFT JOIN notas n
                    ON n.avaliacao_id = av.id
                   AND n.matricula_id = :matricula_id

                WHERE td.turma_id = :turma_id
                  AND av.status <> 'Cancelada'

                ORDER BY
                    pl.ordem DESC,
                    av.data_avaliacao DESC,
                    av.id DESC
            "
        );

    $stmt->execute([
        ':matricula_id' =>
            (int) $matricula['id'],

        ':turma_id' =>
            (int) $matricula['classId']
    ]);

    $grades =
        [];

    $subjectMap =
        [];

    $periodMap =
        [];

    $normalizedValues =
        [];

    foreach (
        $stmt->fetchAll()
        as $row
    ) {

        $value =
            $row['valor'] === null
                ? null
                : (float) $row['valor'];

        $maximum =
            (float) $row['valor_maximo'];

        $normalized =
            $value === null ||
            $maximum <= 0
                ? null
                : round(
                    ($value / $maximum) * 10,
                    1
                );

        if ($normalized !== null) {
            $normalizedValues[] =
                $normalized;
        }

        $subjectId =
            (int) $row['disciplina_id'];

        $periodId =
            (int) $row['periodo_id'];

        $subjectMap[$subjectId] = [
            'id' =>
                $subjectId,

            'name' =>
                (string) $row['disciplina']
        ];

        $periodMap[$periodId] = [
            'id' =>
                $periodId,

            'name' =>
                (string) $row['periodo']
        ];

        $grades[] = [
            'id' =>
                (int) $row['id'],

            'title' =>
                (string) $row['titulo'],

            'description' =>
                (string) (
                    $row['descricao']
                    ?? ''
                ),

            'type' =>
                (string) $row['tipo'],

            'subjectId' =>
                $subjectId,

            'subject' =>
                (string) $row['disciplina'],

            'periodId' =>
                $periodId,

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
                $normalized,

            'observation' =>
                (string) (
                    $row['observacao']
                    ?? ''
                ),

            'launchedAt' =>
                $row['lancada_em']
        ];
    }

    $graded =
        count(
            $normalizedValues
        );

    $pending =
        count($grades) -
        $graded;

    $average =
        $graded > 0
            ? round(
                array_sum(
                    $normalizedValues
                ) / $graded,
                1
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
            array_values(
                $subjectMap
            ),

        'periods' =>
            array_values(
                $periodMap
            ),

        'grades' =>
            $grades,

        'summary' => [
            'average' =>
                $average,

            'graded' =>
                $graded,

            'pending' =>
                $pending,

            'subjects' =>
                count(
                    $subjectMap
                )
        ]
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Aluno Notas GET: ' .
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

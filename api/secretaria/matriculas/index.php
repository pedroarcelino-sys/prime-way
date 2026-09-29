<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('GET');
primewayExigirPerfis(['secretaria']);

try {

    $pdo = primewayPdo();

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

    $classes = [];

    if ($anoLetivoId > 0) {

        $stmtClasses = $pdo->prepare(
            "
                SELECT
                    t.id,
                    t.nome,
                    t.serie,
                    t.turno,
                    t.sala,
                    t.capacidade,
                    t.status,

                    COUNT(
                        CASE
                            WHEN m.situacao = 'Ativa'
                            THEN 1
                        END
                    ) AS ocupacao

                FROM turmas t

                LEFT JOIN matriculas m
                    ON m.turma_id = t.id

                WHERE t.ano_letivo_id =
                    :ano_letivo_id

                GROUP BY
                    t.id,
                    t.nome,
                    t.serie,
                    t.turno,
                    t.sala,
                    t.capacidade,
                    t.status

                ORDER BY
                    t.nome ASC
            "
        );

        $stmtClasses->execute([
            ':ano_letivo_id' =>
                $anoLetivoId
        ]);

        $classes = array_map(
            static fn (
                array $row
            ): array => [
                'id' =>
                    (int) $row['id'],

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

                'occupancy' =>
                    (int) $row['ocupacao'],

                'status' =>
                    (string) $row['status']
            ],
            $stmtClasses->fetchAll()
        );
    }

    $stmtStudents = $pdo->query(
        "
            SELECT
                a.id,
                a.matricula,
                a.status,
                pe.nome,
                pe.email_contato,
                pe.ativo AS pessoa_ativa

            FROM alunos a

            INNER JOIN pessoas pe
                ON pe.id = a.pessoa_id

            ORDER BY
                pe.nome ASC,
                a.id ASC
        "
    );

    $students = [];

    foreach ($stmtStudents->fetchAll() as $row) {

        $id = (int) $row['id'];

        $students[$id] = [
            'id' =>
                $id,

            'name' =>
                (string) $row['nome'],

            'registration' =>
                (string) $row['matricula'],

            'email' =>
                (string) (
                    $row['email_contato']
                    ?? ''
                ),

            'status' =>
                (string) $row['status'],

            'personActive' =>
                (int) $row['pessoa_ativa'] === 1,

            'currentEnrollment' =>
                null,

            'history' =>
                []
        ];
    }

    if (
        $students !== []
        &&
        $anoLetivoId > 0
    ) {

        $studentIds =
            array_keys($students);

        $markers =
            implode(
                ',',
                array_fill(
                    0,
                    count($studentIds),
                    '?'
                )
            );

        $stmtEnrollments = $pdo->prepare(
            "
                SELECT
                    m.id,
                    m.aluno_id,
                    m.turma_id,
                    m.numero_chamada,
                    m.data_matricula,
                    m.situacao,
                    m.criado_em,
                    m.atualizado_em,

                    t.nome AS turma_nome,
                    t.serie,
                    t.turno,
                    t.sala

                FROM matriculas m

                INNER JOIN turmas t
                    ON t.id = m.turma_id

                WHERE m.aluno_id IN ($markers)
                  AND t.ano_letivo_id = ?

                ORDER BY
                    m.aluno_id ASC,
                    CASE
                        WHEN m.situacao = 'Ativa'
                        THEN 0
                        ELSE 1
                    END,
                    m.atualizado_em DESC,
                    m.id DESC
            "
        );

        $params = array_values($studentIds);
        $params[] = $anoLetivoId;

        $stmtEnrollments->execute($params);

        foreach ($stmtEnrollments->fetchAll() as $row) {

            $studentId =
                (int) $row['aluno_id'];

            if (!isset($students[$studentId])) {
                continue;
            }

            $item = [
                'id' =>
                    (int) $row['id'],

                'classId' =>
                    (int) $row['turma_id'],

                'className' =>
                    (string) $row['turma_nome'],

                'series' =>
                    (string) $row['serie'],

                'shift' =>
                    (string) $row['turno'],

                'room' =>
                    (string) (
                        $row['sala']
                        ?? ''
                    ),

                'callNumber' =>
                    $row['numero_chamada'] === null
                        ? null
                        : (int) $row['numero_chamada'],

                'enrollmentDate' =>
                    (string) $row['data_matricula'],

                'status' =>
                    (string) $row['situacao']
            ];

            $students[$studentId]['history'][] =
                $item;

            if (
                $row['situacao'] === 'Ativa'
                &&
                $students[$studentId]['currentEnrollment'] === null
            ) {
                $students[$studentId]['currentEnrollment'] =
                    $item;
            }
        }
    }

    $studentList =
        array_values($students);

    $summary = [
        'students' =>
            count($studentList),

        'enrolled' =>
            0,

        'withoutClass' =>
            0,

        'activeClasses' =>
            0
    ];

    foreach ($studentList as $student) {

        if (
            $student['currentEnrollment'] !== null
        ) {
            $summary['enrolled']++;
        } else {
            $summary['withoutClass']++;
        }
    }

    foreach ($classes as $class) {
        if ($class['status'] === 'Ativa') {
            $summary['activeClasses']++;
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
            $classes,

        'students' =>
            $studentList
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Secretaria Matrículas GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            'Não foi possível carregar as matrículas da Secretaria.'
    ], 500);
}

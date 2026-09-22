<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';

primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'professor'
    ]);

try {

    $pdo =
        primewayPdo();

    $contexto =
        primewayProfessorContexto(
            $pdo,
            $usuario
        );

    $professorId =
        (int) $contexto[
            'profile'
        ][
            'professorId'
        ];

    $anoId =
        (int) (
            $contexto[
                'schoolYear'
            ][
                'id'
            ]
            ?? 0
        );

    $assignments =
        [];

    if ($anoId > 0) {

        $stmt =
            $pdo->prepare(
                "
                    SELECT
                        td.id,
                        td.carga_horaria,

                        t.id AS turma_id,
                        t.nome AS turma_nome,
                        t.serie,
                        t.turno,

                        d.id AS disciplina_id,
                        d.codigo,
                        d.nome AS disciplina_nome,
                        d.area

                    FROM turma_disciplinas td

                    INNER JOIN turmas t
                        ON t.id = td.turma_id

                    INNER JOIN disciplinas d
                        ON d.id = td.disciplina_id

                    WHERE td.professor_id =
                        :professor_id

                      AND td.status = 'Ativa'
                      AND t.status = 'Ativa'
                      AND d.status = 'Ativa'
                      AND t.ano_letivo_id =
                        :ano_letivo_id

                    ORDER BY
                        t.nome ASC,
                        d.nome ASC
                "
            );

        $stmt->execute([
            ':professor_id' =>
                $professorId,

            ':ano_letivo_id' =>
                $anoId
        ]);

        $assignments =
            array_map(
                static fn (
                    array $row
                ): array => [
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

                    'subjectId' =>
                        (int) $row['disciplina_id'],

                    'subjectCode' =>
                        (string) $row['codigo'],

                    'subjectName' =>
                        (string) $row['disciplina_nome'],

                    'area' =>
                        (string) $row['area'],

                    'workload' =>
                        (int) $row['carga_horaria']
                ],
                $stmt->fetchAll()
            );
    }

    primewayResponderJson([
        'success' => true,
        'profile' =>
            $contexto['profile'],
        'schoolYear' =>
            $contexto['schoolYear'],
        'assignments' =>
            $assignments
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Professor Dados GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar os dados do professor.'
        ],
        500
    );
}

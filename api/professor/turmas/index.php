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

    if ($anoId <= 0) {

        primewayResponderJson([
            'success' => true,
            'profile' =>
                $contexto['profile'],
            'schoolYear' =>
                null,
            'classes' =>
                [],
            'students' =>
                [],
            'classSubjects' =>
                []
        ]);
    }

    $stmtTurmas =
        $pdo->prepare(
            "
                SELECT DISTINCT
                    t.id,
                    t.nome,
                    t.serie,
                    t.turno,
                    t.sala,
                    t.capacidade,
                    t.professor_id,

                    CASE
                        WHEN t.professor_id =
                            :professor_regente_flag
                        THEN 1
                        ELSE 0
                    END AS regente,

                    (
                        SELECT COUNT(*)

                        FROM matriculas m2

                        WHERE m2.turma_id = t.id
                          AND m2.situacao = 'Ativa'
                    ) AS alunos

                FROM turmas t

                LEFT JOIN turma_disciplinas td
                    ON td.turma_id = t.id
                   AND td.professor_id =
                       :professor_disciplina
                   AND td.status = 'Ativa'

                WHERE t.ano_letivo_id =
                    :ano_letivo_id

                  AND t.status = 'Ativa'

                  AND (
                        t.professor_id =
                            :professor_regente

                        OR

                        td.professor_id =
                            :professor_filtro
                      )

                ORDER BY
                    t.nome ASC
            "
        );

    $stmtTurmas->execute([
        ':professor_regente_flag' =>
            $professorId,

        ':professor_disciplina' =>
            $professorId,

        ':ano_letivo_id' =>
            $anoId,

        ':professor_regente' =>
            $professorId,

        ':professor_filtro' =>
            $professorId
    ]);

    $classes =
        array_map(
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

                'students' =>
                    (int) $row['alunos'],

                'homeroomTeacher' =>
                    (int) $row['regente'] === 1
            ],
            $stmtTurmas->fetchAll()
        );

    $classIds =
        array_map(
            static fn (
                array $item
            ): int =>
                (int) $item['id'],
            $classes
        );

    if ($classIds === []) {

        primewayResponderJson([
            'success' => true,
            'profile' =>
                $contexto['profile'],
            'schoolYear' =>
                $contexto['schoolYear'],
            'classes' =>
                [],
            'students' =>
                [],
            'classSubjects' =>
                []
        ]);
    }

    $placeholders =
        implode(
            ',',
            array_fill(
                0,
                count($classIds),
                '?'
            )
        );

    $stmtDisciplinas =
        $pdo->prepare(
            "
                SELECT
                    td.id,
                    td.turma_id,
                    td.disciplina_id,
                    td.carga_horaria,
                    d.codigo,
                    d.nome,
                    d.area

                FROM turma_disciplinas td

                INNER JOIN disciplinas d
                    ON d.id = td.disciplina_id

                WHERE td.professor_id = ?
                  AND td.status = 'Ativa'
                  AND d.status = 'Ativa'
                  AND td.turma_id IN (
                        {$placeholders}
                  )

                ORDER BY
                    td.turma_id ASC,
                    d.nome ASC
            "
        );

    $stmtDisciplinas->execute(
        array_merge(
            [
                $professorId
            ],
            $classIds
        )
    );

    $classSubjects =
        array_map(
            static fn (
                array $row
            ): array => [
                'id' =>
                    (int) $row['id'],

                'classId' =>
                    (int) $row['turma_id'],

                'subjectId' =>
                    (int) $row['disciplina_id'],

                'code' =>
                    (string) $row['codigo'],

                'name' =>
                    (string) $row['nome'],

                'area' =>
                    (string) $row['area'],

                'workload' =>
                    (int) $row['carga_horaria']
            ],
            $stmtDisciplinas->fetchAll()
        );

    $stmtAlunos =
        $pdo->prepare(
            "
                SELECT
                    m.id AS matricula_id,
                    m.turma_id,
                    m.numero_chamada,

                    a.id AS aluno_id,
                    a.matricula AS registro_aluno,

                    pe.nome,
                    pe.email_contato,
                    pe.telefone

                FROM matriculas m

                INNER JOIN alunos a
                    ON a.id = m.aluno_id

                INNER JOIN pessoas pe
                    ON pe.id = a.pessoa_id

                WHERE m.situacao = 'Ativa'
                  AND m.turma_id IN (
                        {$placeholders}
                  )

                ORDER BY
                    m.turma_id ASC,
                    m.numero_chamada IS NULL,
                    m.numero_chamada ASC,
                    pe.nome ASC
            "
        );

    $stmtAlunos->execute(
        $classIds
    );

    $students =
        array_map(
            static fn (
                array $row
            ): array => [
                'enrollmentId' =>
                    (int) $row['matricula_id'],

                'classId' =>
                    (int) $row['turma_id'],

                'callNumber' =>
                    $row['numero_chamada'] === null
                        ? null
                        : (int) $row['numero_chamada'],

                'studentId' =>
                    (int) $row['aluno_id'],

                'registration' =>
                    (string) $row['registro_aluno'],

                'name' =>
                    (string) $row['nome'],

                'email' =>
                    (string) (
                        $row['email_contato']
                        ?? ''
                    ),

                'phone' =>
                    (string) (
                        $row['telefone']
                        ?? ''
                    )
            ],
            $stmtAlunos->fetchAll()
        );

    primewayResponderJson([
        'success' => true,
        'profile' =>
            $contexto['profile'],
        'schoolYear' =>
            $contexto['schoolYear'],
        'classes' =>
            $classes,
        'students' =>
            $students,
        'classSubjects' =>
            $classSubjects
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Professor Turmas GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar suas turmas.'
        ],
        500
    );
}

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
            'classSubjects' =>
                [],
            'periods' =>
                [],
            'lessons' =>
                [],
            'studentsByClassSubject' =>
                new stdClass(),
            'attendanceByLesson' =>
                new stdClass()
        ]);
    }

    $stmtVinculos =
        $pdo->prepare(
            "
                SELECT
                    td.id,
                    td.turma_id,
                    td.disciplina_id,
                    td.carga_horaria,

                    t.nome AS turma_nome,
                    t.serie,
                    t.turno,
                    t.sala,

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

    $stmtVinculos->execute([
        ':professor_id' =>
            $professorId,

        ':ano_letivo_id' =>
            $anoId
    ]);

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

                'subjectCode' =>
                    (string) $row['codigo'],

                'subjectName' =>
                    (string) $row['disciplina_nome'],

                'area' =>
                    (string) $row['area'],

                'workload' =>
                    (int) $row['carga_horaria']
            ],
            $stmtVinculos->fetchAll()
        );

    $stmtPeriodos =
        $pdo->prepare(
            "
                SELECT
                    id,
                    nome,
                    ordem,
                    data_inicio,
                    data_fim

                FROM periodos_letivos

                WHERE ano_letivo_id =
                    :ano_letivo_id

                ORDER BY ordem ASC
            "
        );

    $stmtPeriodos->execute([
        ':ano_letivo_id' =>
            $anoId
    ]);

    $periods =
        array_map(
            static fn (
                array $row
            ): array => [
                'id' =>
                    (int) $row['id'],

                'name' =>
                    (string) $row['nome'],

                'order' =>
                    (int) $row['ordem'],

                'startDate' =>
                    (string) $row['data_inicio'],

                'endDate' =>
                    (string) $row['data_fim']
            ],
            $stmtPeriodos->fetchAll()
        );

    $stmtAulas =
        $pdo->prepare(
            "
                SELECT
                    au.id,
                    au.turma_disciplina_id,
                    au.periodo_letivo_id,
                    au.data_aula,
                    au.horario_inicio,
                    au.horario_fim,
                    au.conteudo,
                    au.observacoes,
                    au.status,
                    au.criado_em,
                    au.atualizado_em,

                    t.id AS turma_id,
                    t.nome AS turma_nome,

                    d.id AS disciplina_id,
                    d.nome AS disciplina_nome,

                    pl.nome AS periodo_nome,

                    (
                        SELECT COUNT(*)

                        FROM matriculas m

                        WHERE m.turma_id = t.id
                          AND m.situacao = 'Ativa'
                    ) AS total_alunos,

                    (
                        SELECT COUNT(*)

                        FROM frequencias f

                        INNER JOIN matriculas m2
                            ON m2.id = f.matricula_id
                           AND m2.turma_id = t.id

                        WHERE f.aula_id = au.id
                    ) AS frequencias_lancadas

                FROM aulas au

                INNER JOIN turma_disciplinas td
                    ON td.id =
                       au.turma_disciplina_id

                INNER JOIN turmas t
                    ON t.id =
                       td.turma_id

                INNER JOIN disciplinas d
                    ON d.id =
                       td.disciplina_id

                INNER JOIN periodos_letivos pl
                    ON pl.id =
                       au.periodo_letivo_id

                WHERE td.professor_id =
                    :professor_id

                  AND t.ano_letivo_id =
                    :ano_letivo_id

                ORDER BY
                    au.data_aula DESC,
                    au.horario_inicio DESC,
                    au.id DESC

                LIMIT 200
            "
        );

    $stmtAulas->execute([
        ':professor_id' =>
            $professorId,

        ':ano_letivo_id' =>
            $anoId
    ]);

    $lessons =
        array_map(
            static fn (
                array $row
            ): array => [
                'id' =>
                    (int) $row['id'],

                'classSubjectId' =>
                    (int) $row['turma_disciplina_id'],

                'periodId' =>
                    (int) $row['periodo_letivo_id'],

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

                'notes' =>
                    (string) (
                        $row['observacoes']
                        ?? ''
                    ),

                'status' =>
                    (string) $row['status'],

                'class' => [
                    'id' =>
                        (int) $row['turma_id'],

                    'name' =>
                        (string) $row['turma_nome']
                ],

                'subject' => [
                    'id' =>
                        (int) $row['disciplina_id'],

                    'name' =>
                        (string) $row['disciplina_nome']
                ],

                'period' => [
                    'id' =>
                        (int) $row['periodo_letivo_id'],

                    'name' =>
                        (string) $row['periodo_nome']
                ],

                'summary' => [
                    'students' =>
                        (int) $row['total_alunos'],

                    'registered' =>
                        (int) $row['frequencias_lancadas']
                ],

                'createdAt' =>
                    (string) $row['criado_em'],

                'updatedAt' =>
                    (string) $row['atualizado_em']
            ],
            $stmtAulas->fetchAll()
        );

    $stmtAlunos =
        $pdo->prepare(
            "
                SELECT
                    td.id AS turma_disciplina_id,

                    m.id AS matricula_id,
                    m.numero_chamada,

                    a.id AS aluno_id,
                    a.matricula AS registro_aluno,

                    pe.nome

                FROM turma_disciplinas td

                INNER JOIN turmas t
                    ON t.id = td.turma_id

                INNER JOIN matriculas m
                    ON m.turma_id = t.id
                   AND m.situacao = 'Ativa'

                INNER JOIN alunos a
                    ON a.id = m.aluno_id

                INNER JOIN pessoas pe
                    ON pe.id = a.pessoa_id

                WHERE td.professor_id =
                    :professor_id

                  AND td.status = 'Ativa'
                  AND t.status = 'Ativa'
                  AND t.ano_letivo_id =
                    :ano_letivo_id

                ORDER BY
                    td.id ASC,
                    m.numero_chamada IS NULL,
                    m.numero_chamada ASC,
                    pe.nome ASC
            "
        );

    $stmtAlunos->execute([
        ':professor_id' =>
            $professorId,

        ':ano_letivo_id' =>
            $anoId
    ]);

    $studentsByClassSubject =
        [];

    foreach (
        $stmtAlunos->fetchAll()
        as $row
    ) {

        $key =
            (string) (
                (int) $row[
                    'turma_disciplina_id'
                ]
            );

        if (
            !isset(
                $studentsByClassSubject[
                    $key
                ]
            )
        ) {
            $studentsByClassSubject[
                $key
            ] = [];
        }

        $studentsByClassSubject[
            $key
        ][] = [
            'enrollmentId' =>
                (int) $row['matricula_id'],

            'studentId' =>
                (int) $row['aluno_id'],

            'name' =>
                (string) $row['nome'],

            'registration' =>
                (string) $row['registro_aluno'],

            'callNumber' =>
                $row['numero_chamada'] === null
                    ? null
                    : (int) $row['numero_chamada']
        ];
    }

    $stmtFrequencias =
        $pdo->prepare(
            "
                SELECT
                    f.id,
                    f.aula_id,
                    f.matricula_id,
                    f.situacao,
                    f.observacao,
                    f.registrado_em

                FROM frequencias f

                INNER JOIN aulas au
                    ON au.id = f.aula_id

                INNER JOIN turma_disciplinas td
                    ON td.id =
                       au.turma_disciplina_id

                INNER JOIN turmas t
                    ON t.id =
                       td.turma_id

                INNER JOIN matriculas m
                    ON m.id =
                       f.matricula_id
                   AND m.turma_id =
                       t.id

                WHERE td.professor_id =
                    :professor_id

                  AND t.ano_letivo_id =
                    :ano_letivo_id

                ORDER BY
                    f.aula_id ASC,
                    f.matricula_id ASC
            "
        );

    $stmtFrequencias->execute([
        ':professor_id' =>
            $professorId,

        ':ano_letivo_id' =>
            $anoId
    ]);

    $attendanceByLesson =
        [];

    foreach (
        $stmtFrequencias->fetchAll()
        as $row
    ) {

        $lessonKey =
            (string) (
                (int) $row['aula_id']
            );

        $enrollmentKey =
            (string) (
                (int) $row['matricula_id']
            );

        if (
            !isset(
                $attendanceByLesson[
                    $lessonKey
                ]
            )
        ) {
            $attendanceByLesson[
                $lessonKey
            ] = [];
        }

        $attendanceByLesson[
            $lessonKey
        ][
            $enrollmentKey
        ] = [
            'id' =>
                (int) $row['id'],

            'lessonId' =>
                (int) $row['aula_id'],

            'enrollmentId' =>
                (int) $row['matricula_id'],

            'status' =>
                (string) $row['situacao'],

            'observation' =>
                (string) (
                    $row['observacao']
                    ?? ''
                ),

            'registeredAt' =>
                (string) $row['registrado_em']
        ];
    }

    primewayResponderJson([
        'success' => true,

        'profile' =>
            $contexto['profile'],

        'schoolYear' =>
            $contexto['schoolYear'],

        'classSubjects' =>
            $classSubjects,

        'periods' =>
            $periods,

        'lessons' =>
            $lessons,

        'studentsByClassSubject' =>
            $studentsByClassSubject === []
                ? new stdClass()
                : $studentsByClassSubject,

        'attendanceByLesson' =>
            $attendanceByLesson === []
                ? new stdClass()
                : $attendanceByLesson,

        'csrfToken' =>
            primewayTokenCsrf()
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Professor Frequência GET: ' .
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

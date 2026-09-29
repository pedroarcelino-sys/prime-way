<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('GET');

primewayExigirPerfis([
    'secretaria'
]);

try {

    $pdo = primewayPdo();

    $stmtAno = $pdo->query(
        "
            SELECT
                id,
                ano

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

    $stmt = $pdo->query(
        "
            SELECT
                p.id,
                p.pessoa_id,
                p.registro_funcional,
                p.status,
                p.admissao_em,

                pe.nome,
                pe.email_contato,
                pe.telefone,
                pe.documento,
                pe.data_nascimento,
                pe.ativo AS pessoa_ativa,

                u.id AS usuario_id,
                u.email AS email_acesso,
                u.ativo AS conta_ativa,
                u.ultimo_login

            FROM professores p

            INNER JOIN pessoas pe
                ON pe.id = p.pessoa_id

            LEFT JOIN usuarios u
                ON u.pessoa_id = pe.id
               AND u.perfil = 'professor'

            ORDER BY
                pe.nome ASC,
                p.id ASC
        "
    );

    $teachers = [];

    foreach ($stmt->fetchAll() as $row) {

        $id = (int) $row['id'];

        $teachers[$id] = [
            'id' => $id,

            'personId' =>
                (int) $row['pessoa_id'],

            'name' =>
                (string) $row['nome'],

            'registration' =>
                (string) (
                    $row['registro_funcional']
                    ?? ''
                ),

            'status' =>
                (string) $row['status'],

            'admissionDate' =>
                $row['admissao_em'],

            'email' =>
                (string) (
                    $row['email_acesso']
                    ?? $row['email_contato']
                    ?? ''
                ),

            'contactEmail' =>
                (string) (
                    $row['email_contato']
                    ?? ''
                ),

            'phone' =>
                (string) (
                    $row['telefone']
                    ?? ''
                ),

            'document' =>
                (string) (
                    $row['documento']
                    ?? ''
                ),

            'birthDate' =>
                $row['data_nascimento'],

            'personActive' =>
                (int) $row['pessoa_ativa'] === 1,

            'accountActive' =>
                $row['usuario_id'] !== null
                &&
                (int) (
                    $row['conta_ativa']
                    ?? 0
                ) === 1,

            'lastLogin' =>
                $row['ultimo_login'],

            'mainClasses' => [],
            'assignments' => []
        ];
    }

    if (
        $teachers !== []
        &&
        $anoLetivoId > 0
    ) {

        $stmtMainClasses =
            $pdo->prepare(
                "
                    SELECT
                        t.id,
                        t.professor_id,
                        t.nome,
                        t.serie,
                        t.turno,
                        t.sala,
                        t.status

                    FROM turmas t

                    WHERE t.ano_letivo_id =
                        :ano_letivo_id

                      AND t.professor_id
                          IS NOT NULL

                    ORDER BY
                        t.nome ASC
                "
            );

        $stmtMainClasses->execute([
            ':ano_letivo_id' =>
                $anoLetivoId
        ]);

        foreach (
            $stmtMainClasses->fetchAll()
            as $row
        ) {

            $professorId =
                (int) $row['professor_id'];

            if (
                !isset(
                    $teachers[$professorId]
                )
            ) {
                continue;
            }

            $teachers[$professorId]['mainClasses'][] = [
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

                'status' =>
                    (string) $row['status']
            ];
        }

        $stmtAssignments =
            $pdo->prepare(
                "
                    SELECT
                        td.id,
                        td.professor_id,
                        td.carga_horaria,
                        td.status AS vinculo_status,

                        t.id AS turma_id,
                        t.nome AS turma_nome,
                        t.serie,
                        t.turno,

                        d.id AS disciplina_id,
                        d.codigo AS disciplina_codigo,
                        d.nome AS disciplina_nome,
                        d.area AS disciplina_area,
                        d.status AS disciplina_status

                    FROM turma_disciplinas td

                    INNER JOIN turmas t
                        ON t.id = td.turma_id

                    INNER JOIN disciplinas d
                        ON d.id = td.disciplina_id

                    WHERE t.ano_letivo_id =
                        :ano_letivo_id

                    ORDER BY
                        t.nome ASC,
                        d.nome ASC
                "
            );

        $stmtAssignments->execute([
            ':ano_letivo_id' =>
                $anoLetivoId
        ]);

        foreach (
            $stmtAssignments->fetchAll()
            as $row
        ) {

            $professorId =
                (int) $row['professor_id'];

            if (
                !isset(
                    $teachers[$professorId]
                )
            ) {
                continue;
            }

            $teachers[$professorId]['assignments'][] = [
                'id' =>
                    (int) $row['id'],

                'status' =>
                    (string) $row['vinculo_status'],

                'workload' =>
                    (int) $row['carga_horaria'],

                'class' => [
                    'id' =>
                        (int) $row['turma_id'],

                    'name' =>
                        (string) $row['turma_nome'],

                    'series' =>
                        (string) $row['serie'],

                    'shift' =>
                        (string) $row['turno']
                ],

                'subject' => [
                    'id' =>
                        (int) $row['disciplina_id'],

                    'code' =>
                        (string) $row['disciplina_codigo'],

                    'name' =>
                        (string) $row['disciplina_nome'],

                    'area' =>
                        (string) $row['disciplina_area'],

                    'status' =>
                        (string) $row['disciplina_status']
                ]
            ];
        }
    }

    $teacherList =
        array_values(
            $teachers
        );

    $summary = [
        'total' => count($teacherList),
        'active' => 0,
        'activeAccounts' => 0,
        'withAssignments' => 0,
        'withoutAssignments' => 0
    ];

    foreach (
        $teacherList
        as $teacher
    ) {

        $isActive =
            $teacher['status'] === 'ativo'
            &&
            $teacher['personActive'];

        if ($isActive) {
            $summary['active']++;
        }

        if (
            $teacher['accountActive']
        ) {
            $summary['activeAccounts']++;
        }

        $hasAcademicLink =
            $teacher['mainClasses'] !== []
            ||
            $teacher['assignments'] !== [];

        if ($hasAcademicLink) {
            $summary['withAssignments']++;
        } else {
            $summary['withoutAssignments']++;
        }
    }

    primewayResponderJson([
        'success' => true,

        'schoolYear' =>
            $ano === null
                ? null
                : [
                    'id' =>
                        (int) $ano['id'],

                    'year' =>
                        (int) $ano['ano']
                ],

        'summary' =>
            $summary,

        'teachers' =>
            $teacherList
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Secretaria Professores GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' =>
            'Não foi possível carregar os professores da Secretaria.'
    ], 500);
}

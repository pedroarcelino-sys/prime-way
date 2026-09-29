<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('GET');

primewayExigirPerfis([
    'secretaria'
]);

try {

    $pdo = primewayPdo();

    /*====================================================
                    ANO LETIVO ATIVO
    ====================================================*/

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

    /*====================================================
                        ALUNOS
    ====================================================*/

    $stmt = $pdo->prepare(
        "
            SELECT
                a.id AS aluno_id,
                a.pessoa_id,
                a.matricula AS matricula_aluno,
                a.status AS aluno_status,
                a.novo_aluno,
                a.ingresso_em,

                pe.nome,
                pe.email_contato,
                pe.telefone,
                pe.documento,
                pe.data_nascimento,
                pe.ativo AS pessoa_ativa,

                u.id AS usuario_id,
                u.email AS email_acesso,
                u.ativo AS usuario_ativo,

                m.id AS matricula_id,
                m.numero_chamada,
                m.data_matricula,
                m.situacao AS matricula_situacao,

                t.id AS turma_id,
                t.nome AS turma_nome,
                t.serie,
                t.turno,
                t.sala,
                t.status AS turma_status

            FROM alunos a

            INNER JOIN pessoas pe
                ON pe.id = a.pessoa_id

            LEFT JOIN usuarios u
                ON u.pessoa_id = pe.id
               AND u.perfil = 'aluno'

            LEFT JOIN matriculas m
                ON m.aluno_id = a.id
               AND m.situacao = 'Ativa'
               AND EXISTS (
                    SELECT 1
                    FROM turmas tx
                    WHERE tx.id = m.turma_id
                      AND tx.ano_letivo_id = :ano_letivo_id
               )

            LEFT JOIN turmas t
                ON t.id = m.turma_id

            ORDER BY
                pe.nome ASC,
                a.id ASC
        "
    );

    $stmt->execute([
        ':ano_letivo_id' =>
            $anoLetivoId
    ]);

    $students = [];
    $seen = [];

    while ($row = $stmt->fetch()) {

        $studentId =
            (int) $row['aluno_id'];

        if (isset($seen[$studentId])) {
            throw new RuntimeException(
                sprintf(
                    'O aluno %d possui mais de uma matrícula ativa no ano letivo atual.',
                    $studentId
                )
            );
        }

        $seen[$studentId] = true;

        $personActive =
            (int) $row['pessoa_ativa'] === 1;

        $studentStatus =
            (string) $row['aluno_status'];

        $displayStatus =
            !$personActive
                ? 'Inativo'
                : match ($studentStatus) {
                    'ativo' => 'Ativo',
                    'pendente' => 'Pendente',
                    default => 'Inativo'
                };

        $students[$studentId] = [
            'id' =>
                $studentId,

            'personId' =>
                (int) $row['pessoa_id'],

            'name' =>
                (string) $row['nome'],

            'registration' =>
                (string) $row['matricula_aluno'],

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

            'status' =>
                $displayStatus,

            'studentStatus' =>
                $studentStatus,

            'personActive' =>
                $personActive,

            'newStudent' =>
                (int) $row['novo_aluno'] === 1,

            'entryDate' =>
                $row['ingresso_em'],

            'hasAccess' =>
                $row['usuario_id'] !== null
                && (int) (
                    $row['usuario_ativo']
                    ?? 0
                ) === 1,

            'class' =>
                $row['turma_id'] === null
                    ? null
                    : [
                        'id' =>
                            (int) $row['turma_id'],

                        'name' =>
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

                        'status' =>
                            (string) $row['turma_status']
                    ],

            'enrollment' =>
                $row['matricula_id'] === null
                    ? null
                    : [
                        'id' =>
                            (int) $row['matricula_id'],

                        'callNumber' =>
                            $row['numero_chamada'] === null
                                ? null
                                : (int) $row['numero_chamada'],

                        'date' =>
                            (string) $row['data_matricula'],

                        'status' =>
                            (string) $row['matricula_situacao']
                    ],

            'guardians' =>
                []
        ];
    }

    /*====================================================
                    RESPONSÁVEIS VINCULADOS
    ====================================================*/

    if ($students !== []) {

        $ids =
            array_keys(
                $students
            );

        $placeholders =
            implode(
                ',',
                array_fill(
                    0,
                    count($ids),
                    '?'
                )
            );

        $stmtGuardians = $pdo->prepare(
            "
                SELECT
                    ar.aluno_id,
                    ar.parentesco,
                    ar.autorizado_retirada,
                    ar.contato_principal,
                    ar.responsavel_financeiro,
                    ar.ativo AS vinculo_ativo,

                    r.id AS responsavel_id,
                    r.status AS responsavel_status,

                    pe.nome AS responsavel_nome,
                    pe.email_contato AS responsavel_email_contato,
                    pe.telefone AS responsavel_telefone,

                    u.email AS responsavel_email_acesso,
                    u.ativo AS responsavel_usuario_ativo

                FROM aluno_responsavel ar

                INNER JOIN responsaveis r
                    ON r.id = ar.responsavel_id

                INNER JOIN pessoas pe
                    ON pe.id = r.pessoa_id

                LEFT JOIN usuarios u
                    ON u.pessoa_id = pe.id
                   AND u.perfil = 'responsavel'

                WHERE ar.aluno_id IN ($placeholders)

                ORDER BY
                    ar.aluno_id ASC,
                    ar.contato_principal DESC,
                    pe.nome ASC
            "
        );

        $stmtGuardians->execute(
            array_values($ids)
        );

        foreach (
            $stmtGuardians->fetchAll()
            as $guardian
        ) {

            $studentId =
                (int) $guardian['aluno_id'];

            if (
                !isset(
                    $students[$studentId]
                )
            ) {
                continue;
            }

            $students[$studentId]['guardians'][] = [
                'id' =>
                    (int) $guardian['responsavel_id'],

                'name' =>
                    (string) $guardian['responsavel_nome'],

                'relationship' =>
                    (string) $guardian['parentesco'],

                'email' =>
                    (string) (
                        $guardian['responsavel_email_acesso']
                        ?? $guardian['responsavel_email_contato']
                        ?? ''
                    ),

                'phone' =>
                    (string) (
                        $guardian['responsavel_telefone']
                        ?? ''
                    ),

                'authorizedPickup' =>
                    (int) $guardian['autorizado_retirada'] === 1,

                'primaryContact' =>
                    (int) $guardian['contato_principal'] === 1,

                'financial' =>
                    (int) $guardian['responsavel_financeiro'] === 1,

                'active' =>
                    (int) $guardian['vinculo_ativo'] === 1
                    &&
                    (string) $guardian['responsavel_status'] === 'ativo'
            ];
        }
    }

    $studentList =
        array_values(
            $students
        );

    $summary = [
        'total' =>
            count($studentList),

        'active' =>
            0,

        'pending' =>
            0,

        'inactive' =>
            0,

        'withoutClass' =>
            0
    ];

    foreach (
        $studentList
        as $student
    ) {

        if ($student['status'] === 'Ativo') {
            $summary['active']++;
        } elseif ($student['status'] === 'Pendente') {
            $summary['pending']++;
        } else {
            $summary['inactive']++;
        }

        if ($student['class'] === null) {
            $summary['withoutClass']++;
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

        'students' =>
            $studentList
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Secretaria Alunos GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' =>
            'Não foi possível carregar os alunos da Secretaria.'
    ], 500);
}

<?php

declare(strict_types=1);

function primewayResponsavelContexto(
    PDO $pdo,
    array $usuario
): array {

    $stmt =
        $pdo->prepare(
            "
                SELECT
                    r.id AS responsavel_id,
                    r.status,

                    pe.id AS pessoa_id,
                    pe.nome,
                    pe.email_contato,
                    pe.telefone,
                    pe.documento,
                    pe.data_nascimento

                FROM usuarios u

                INNER JOIN pessoas pe
                    ON pe.id = u.pessoa_id

                INNER JOIN responsaveis r
                    ON r.pessoa_id = pe.id

                WHERE u.id = :usuario_id
                  AND u.perfil = 'responsavel'
                  AND u.ativo = 1

                LIMIT 1
            "
        );

    $stmt->execute([
        ':usuario_id' =>
            (int) $usuario['id']
    ]);

    $perfil =
        $stmt->fetch();

    if (!$perfil) {
        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Conta sem cadastro de responsável vinculado.'
            ],
            404
        );
    }

    $ano =
        $pdo->query(
            "
                SELECT
                    id,
                    ano,
                    data_inicio,
                    data_fim

                FROM anos_letivos

                WHERE ativo = 1

                ORDER BY ano DESC

                LIMIT 1
            "
        )->fetch()
        ?: null;

    $students = [];

    if ($ano) {

        $stmtStudents =
            $pdo->prepare(
                "
                    SELECT
                        a.id AS aluno_id,
                        a.matricula,
                        a.status AS aluno_status,

                        pe.id AS pessoa_id,
                        pe.nome,
                        pe.email_contato,
                        pe.telefone,

                        ar.parentesco,
                        ar.autorizado_retirada,
                        ar.contato_principal,
                        ar.responsavel_financeiro,

                        m.id AS matricula_id,
                        m.numero_chamada,
                        m.data_matricula,

                        t.id AS turma_id,
                        t.nome AS turma_nome,
                        t.serie,
                        t.turno,
                        t.sala

                    FROM aluno_responsavel ar

                    INNER JOIN alunos a
                        ON a.id = ar.aluno_id

                    INNER JOIN pessoas pe
                        ON pe.id = a.pessoa_id

                    LEFT JOIN matriculas m
                        ON m.aluno_id = a.id
                       AND m.situacao = 'Ativa'
                       AND EXISTS (
                            SELECT 1

                            FROM turmas tx

                            WHERE tx.id = m.turma_id
                              AND tx.ano_letivo_id = :ano_letivo_id
                              AND tx.status = 'Ativa'
                       )

                    LEFT JOIN turmas t
                        ON t.id = m.turma_id

                    WHERE ar.responsavel_id = :responsavel_id
                      AND ar.ativo = 1
                      AND a.status = 'ativo'
                      AND pe.ativo = 1

                    ORDER BY pe.nome ASC
                "
            );

        $stmtStudents->execute([
            ':ano_letivo_id' =>
                (int) $ano['id'],

            ':responsavel_id' =>
                (int) $perfil['responsavel_id']
        ]);

        foreach (
            $stmtStudents->fetchAll()
            as $row
        ) {
            $students[] = [
                'studentId' =>
                    (int) $row['aluno_id'],

                'personId' =>
                    (int) $row['pessoa_id'],

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
                    ),

                'registration' =>
                    (string) $row['matricula'],

                'status' =>
                    (string) $row['aluno_status'],

                'relationship' =>
                    (string) $row['parentesco'],

                'authorizedPickup' =>
                    (int) $row['autorizado_retirada']
                    === 1,

                'primaryContact' =>
                    (int) $row['contato_principal']
                    === 1,

                'financial' =>
                    (int) $row['responsavel_financeiro']
                    === 1,

                'enrollment' =>
                    $row['matricula_id'] === null
                        ? null
                        : [
                            'id' =>
                                (int) $row['matricula_id'],

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

                            'date' =>
                                (string) $row['data_matricula']
                        ]
            ];
        }
    }

    return [
        'profile' => [
            'guardianId' =>
                (int) $perfil['responsavel_id'],

            'personId' =>
                (int) $perfil['pessoa_id'],

            'name' =>
                (string) $perfil['nome'],

            'email' =>
                (string) (
                    $perfil['email_contato']
                    ?? $usuario['email']
                ),

            'phone' =>
                (string) (
                    $perfil['telefone']
                    ?? ''
                ),

            'document' =>
                (string) (
                    $perfil['documento']
                    ?? ''
                ),

            'birthDate' =>
                $perfil['data_nascimento'],

            'status' =>
                (string) $perfil['status']
        ],

        'schoolYear' =>
            $ano
                ? [
                    'id' =>
                        (int) $ano['id'],

                    'year' =>
                        (int) $ano['ano'],

                    'startDate' =>
                        (string) $ano['data_inicio'],

                    'endDate' =>
                        (string) $ano['data_fim']
                ]
                : null,

        'students' =>
            $students
    ];
}


function primewayResponsavelExigirAluno(
    array $contexto,
    int $studentId
): array {

    foreach (
        $contexto['students']
        as $student
    ) {
        if (
            (int) $student['studentId']
            ===
            $studentId
        ) {
            return $student;
        }
    }

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Aluno não vinculado a este responsável.'
        ],
        403
    );
}

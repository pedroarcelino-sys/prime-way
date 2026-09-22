<?php

declare(strict_types=1);

function primewayAlunoContexto(
    PDO $pdo,
    array $usuario
): array {

    $perfilStmt =
        $pdo->prepare(
            "
                SELECT
                    a.id AS aluno_id,
                    a.matricula,
                    a.status,
                    a.ingresso_em,
                    pe.id AS pessoa_id,
                    pe.nome,
                    pe.email_contato,
                    pe.telefone,
                    pe.documento,
                    pe.data_nascimento

                FROM usuarios u

                INNER JOIN pessoas pe
                    ON pe.id = u.pessoa_id

                INNER JOIN alunos a
                    ON a.pessoa_id = pe.id

                WHERE u.id = :usuario_id
                  AND u.perfil = 'aluno'
                  AND u.ativo = 1

                LIMIT 1
            "
        );

    $perfilStmt->execute([
        ':usuario_id' =>
            (int) $usuario['id']
    ]);

    $perfil =
        $perfilStmt->fetch();

    if (!$perfil) {
        primewayResponderJson(
            [
                'success' => false,
                'message' => 'Conta sem cadastro de aluno vinculado.'
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

    $matricula =
        null;

    if ($ano) {

        $stmtMatricula =
            $pdo->prepare(
                "
                    SELECT
                        m.id,
                        m.numero_chamada,
                        m.data_matricula,
                        m.situacao,

                        t.id AS turma_id,
                        t.nome AS turma_nome,
                        t.serie,
                        t.turno,
                        t.sala

                    FROM matriculas m

                    INNER JOIN turmas t
                        ON t.id = m.turma_id

                    WHERE m.aluno_id = :aluno_id
                      AND m.situacao = 'Ativa'
                      AND t.ano_letivo_id = :ano_letivo_id
                      AND t.status = 'Ativa'

                    ORDER BY m.id DESC

                    LIMIT 1
                "
            );

        $stmtMatricula->execute([
            ':aluno_id' =>
                (int) $perfil['aluno_id'],

            ':ano_letivo_id' =>
                (int) $ano['id']
        ]);

        $matricula =
            $stmtMatricula->fetch()
            ?: null;
    }

    return [
        'profile' => [
            'studentId' =>
                (int) $perfil['aluno_id'],

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

            'registration' =>
                (string) $perfil['matricula'],

            'entryDate' =>
                $perfil['ingresso_em'],

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

        'enrollment' =>
            $matricula
                ? [
                    'id' =>
                        (int) $matricula['id'],

                    'classId' =>
                        (int) $matricula['turma_id'],

                    'className' =>
                        (string) $matricula['turma_nome'],

                    'series' =>
                        (string) $matricula['serie'],

                    'shift' =>
                        (string) $matricula['turno'],

                    'room' =>
                        (string) (
                            $matricula['sala']
                            ?? ''
                        ),

                    'callNumber' =>
                        $matricula['numero_chamada'] === null
                            ? null
                            : (int) $matricula['numero_chamada'],

                    'date' =>
                        (string) $matricula['data_matricula']
                ]
                : null
    ];
}

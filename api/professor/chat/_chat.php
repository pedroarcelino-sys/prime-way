<?php

declare(strict_types=1);

function primewayProfessorChatTurmasIds(
    PDO $pdo,
    int $professorId
): array {

    $stmt =
        $pdo->prepare(
            "
                SELECT DISTINCT
                    t.id

                FROM turmas t

                LEFT JOIN turma_disciplinas td
                    ON td.turma_id = t.id
                   AND td.professor_id =
                       :professor_disciplina
                   AND td.status = 'Ativa'

                INNER JOIN anos_letivos al
                    ON al.id = t.ano_letivo_id
                   AND al.ativo = 1

                WHERE t.status = 'Ativa'

                  AND (
                        t.professor_id =
                            :professor_regente

                        OR

                        td.professor_id =
                            :professor_filtro
                      )
            "
        );

    $stmt->execute([
        ':professor_disciplina' =>
            $professorId,

        ':professor_regente' =>
            $professorId,

        ':professor_filtro' =>
            $professorId
    ]);

    return array_map(
        static fn (
            array $row
        ): int =>
            (int) $row['id'],
        $stmt->fetchAll()
    );
}


function primewayProfessorChatContatoPermitido(
    PDO $pdo,
    int $professorId,
    int $contatoUsuarioId
): ?array {

    $stmtSecretaria =
        $pdo->prepare(
            "
                SELECT
                    u.id,
                    u.perfil,
                    COALESCE(
                        pe.nome,
                        u.nome,
                        u.email
                    ) AS nome

                FROM usuarios u

                LEFT JOIN pessoas pe
                    ON pe.id = u.pessoa_id

                WHERE u.id = :usuario_id
                  AND u.ativo = 1
                  AND u.perfil = 'secretaria'

                LIMIT 1
            "
        );

    $stmtSecretaria->execute([
        ':usuario_id' =>
            $contatoUsuarioId
    ]);

    $secretaria =
        $stmtSecretaria->fetch();

    if ($secretaria) {
        return [
            'userId' =>
                (int) $secretaria['id'],

            'name' =>
                (string) $secretaria['nome'],

            'role' =>
                'secretaria',

            'description' =>
                'Secretaria'
        ];
    }

    $turmas =
        primewayProfessorChatTurmasIds(
            $pdo,
            $professorId
        );

    if ($turmas === []) {
        return null;
    }

    $placeholders =
        implode(
            ',',
            array_fill(
                0,
                count($turmas),
                '?'
            )
        );

    $stmtAluno =
        $pdo->prepare(
            "
                SELECT DISTINCT
                    u.id,
                    pe.nome,
                    t.nome AS turma_nome

                FROM usuarios u

                INNER JOIN pessoas pe
                    ON pe.id = u.pessoa_id

                INNER JOIN alunos a
                    ON a.pessoa_id = pe.id
                   AND a.status = 'ativo'

                INNER JOIN matriculas m
                    ON m.aluno_id = a.id
                   AND m.situacao = 'Ativa'

                INNER JOIN turmas t
                    ON t.id = m.turma_id

                WHERE u.id = ?
                  AND u.ativo = 1
                  AND u.perfil = 'aluno'
                  AND m.turma_id IN (
                        {$placeholders}
                  )

                LIMIT 1
            "
        );

    $stmtAluno->execute(
        array_merge(
            [
                $contatoUsuarioId
            ],
            $turmas
        )
    );

    $aluno =
        $stmtAluno->fetch();

    if ($aluno) {
        return [
            'userId' =>
                (int) $aluno['id'],

            'name' =>
                (string) $aluno['nome'],

            'role' =>
                'aluno',

            'description' =>
                'Aluno • ' .
                (string) $aluno['turma_nome']
        ];
    }

    $stmtResponsavel =
        $pdo->prepare(
            "
                SELECT DISTINCT
                    u.id,
                    pe.nome,
                    aluno_pe.nome AS aluno_nome,
                    t.nome AS turma_nome

                FROM usuarios u

                INNER JOIN pessoas pe
                    ON pe.id = u.pessoa_id

                INNER JOIN responsaveis r
                    ON r.pessoa_id = pe.id
                   AND r.status <> 'inativo'

                INNER JOIN aluno_responsavel ar
                    ON ar.responsavel_id = r.id
                   AND ar.ativo = 1

                INNER JOIN alunos a
                    ON a.id = ar.aluno_id
                   AND a.status = 'ativo'

                INNER JOIN pessoas aluno_pe
                    ON aluno_pe.id = a.pessoa_id

                INNER JOIN matriculas m
                    ON m.aluno_id = a.id
                   AND m.situacao = 'Ativa'

                INNER JOIN turmas t
                    ON t.id = m.turma_id

                WHERE u.id = ?
                  AND u.ativo = 1
                  AND u.perfil = 'responsavel'
                  AND m.turma_id IN (
                        {$placeholders}
                  )

                ORDER BY
                    ar.contato_principal DESC,
                    aluno_pe.nome ASC

                LIMIT 1
            "
        );

    $stmtResponsavel->execute(
        array_merge(
            [
                $contatoUsuarioId
            ],
            $turmas
        )
    );

    $responsavel =
        $stmtResponsavel->fetch();

    if (!$responsavel) {
        return null;
    }

    return [
        'userId' =>
            (int) $responsavel['id'],

        'name' =>
            (string) $responsavel['nome'],

        'role' =>
            'responsavel',

        'description' =>
            'Responsável de ' .
            (string) $responsavel['aluno_nome'] .
            ' • ' .
            (string) $responsavel['turma_nome']
    ];
}


function primewayProfessorChatConversa(
    PDO $pdo,
    int $usuarioId,
    int $conversaId
): ?array {

    $stmt =
        $pdo->prepare(
            "
                SELECT
                    c.id,
                    c.tipo,
                    c.titulo,

                    COALESCE(
                        c.titulo,
                        (
                            SELECT
                                COALESCE(
                                    pe2.nome,
                                    u2.nome,
                                    u2.email
                                )

                            FROM conversa_participantes cp2

                            INNER JOIN usuarios u2
                                ON u2.id = cp2.usuario_id

                            LEFT JOIN pessoas pe2
                                ON pe2.id = u2.pessoa_id

                            WHERE cp2.conversa_id = c.id
                              AND cp2.usuario_id <> :usuario_id_outro
                              AND cp2.ativo = 1
                              AND cp2.saiu_em IS NULL

                            LIMIT 1
                        ),
                        'Conversa'
                    ) AS titulo_exibicao,

                    (
                        SELECT
                            u3.perfil

                        FROM conversa_participantes cp3

                        INNER JOIN usuarios u3
                            ON u3.id = cp3.usuario_id

                        WHERE cp3.conversa_id = c.id
                          AND cp3.usuario_id <> :usuario_id_perfil
                          AND cp3.ativo = 1
                          AND cp3.saiu_em IS NULL

                        LIMIT 1
                    ) AS perfil_outro

                FROM conversas c

                INNER JOIN conversa_participantes cp
                    ON cp.conversa_id = c.id

                WHERE c.id = :conversa_id
                  AND c.ativo = 1
                  AND cp.usuario_id = :usuario_id_participante
                  AND cp.ativo = 1
                  AND cp.saiu_em IS NULL

                LIMIT 1
            "
        );

    $stmt->execute([
        ':usuario_id_outro' =>
            $usuarioId,

        ':usuario_id_perfil' =>
            $usuarioId,

        ':conversa_id' =>
            $conversaId,

        ':usuario_id_participante' =>
            $usuarioId
    ]);

    $row =
        $stmt->fetch();

    if (!$row) {
        return null;
    }

    return [
        'id' =>
            (int) $row['id'],

        'type' =>
            (string) $row['tipo'],

        'title' =>
            (string) $row['titulo_exibicao'],

        'role' =>
            (string) (
                $row['perfil_outro']
                ?? ''
            )
    ];
}

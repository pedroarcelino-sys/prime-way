<?php

declare(strict_types=1);

function primewayAlunoChatContatoPermitido(
    PDO $pdo,
    int $turmaId,
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

    if ($turmaId <= 0) {
        return null;
    }

    $stmtProfessor =
        $pdo->prepare(
            "
                SELECT
                    u.id,
                    COALESCE(
                        pe.nome,
                        u.nome,
                        u.email
                    ) AS nome,

                    GROUP_CONCAT(
                        DISTINCT d.nome
                        ORDER BY d.nome
                        SEPARATOR ', '
                    ) AS disciplinas

                FROM usuarios u

                INNER JOIN pessoas pe
                    ON pe.id = u.pessoa_id

                INNER JOIN professores pr
                    ON pr.pessoa_id = pe.id

                INNER JOIN turma_disciplinas td
                    ON td.professor_id = pr.id
                   AND td.status = 'Ativa'

                INNER JOIN disciplinas d
                    ON d.id = td.disciplina_id
                   AND d.status = 'Ativa'

                WHERE u.id = :usuario_id
                  AND u.ativo = 1
                  AND u.perfil = 'professor'
                  AND pr.status = 'ativo'
                  AND td.turma_id = :turma_id

                GROUP BY
                    u.id,
                    pe.nome,
                    u.nome,
                    u.email

                LIMIT 1
            "
        );

    $stmtProfessor->execute([
        ':usuario_id' =>
            $contatoUsuarioId,

        ':turma_id' =>
            $turmaId
    ]);

    $professor =
        $stmtProfessor->fetch();

    if (!$professor) {
        return null;
    }

    return [
        'userId' =>
            (int) $professor['id'],

        'name' =>
            (string) $professor['nome'],

        'role' =>
            'professor',

        'description' =>
            (string) (
                $professor['disciplinas']
                ?: 'Professor(a)'
            )
    ];
}


function primewayAlunoChatConversa(
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

<?php

declare(strict_types=1);

function primewaySecretariaChatContatoPermitido(
    PDO $pdo,
    int $contatoUsuarioId
): ?array {

    $stmt = $pdo->prepare(
        "
            SELECT
                u.id,
                u.perfil,
                u.email,
                u.chat_suspenso,
                u.chat_suspensao_motivo,
                COALESCE(
                    pe.nome,
                    u.nome,
                    u.email
                ) AS nome,

                (
                    SELECT t.nome
                    FROM matriculas m
                    INNER JOIN alunos a
                        ON a.id = m.aluno_id
                    INNER JOIN turmas t
                        ON t.id = m.turma_id
                    WHERE a.pessoa_id = u.pessoa_id
                      AND m.situacao = 'Ativa'
                    ORDER BY m.id DESC
                    LIMIT 1
                ) AS aluno_turma,

                (
                    SELECT GROUP_CONCAT(
                        DISTINCT d.nome
                        ORDER BY d.nome
                        SEPARATOR ', '
                    )
                    FROM professores pr
                    INNER JOIN turma_disciplinas td
                        ON td.professor_id = pr.id
                       AND td.status = 'Ativa'
                    INNER JOIN disciplinas d
                        ON d.id = td.disciplina_id
                       AND d.status = 'Ativa'
                    WHERE pr.pessoa_id = u.pessoa_id
                      AND pr.status = 'ativo'
                ) AS professor_disciplinas

            FROM usuarios u

            LEFT JOIN pessoas pe
                ON pe.id = u.pessoa_id

            WHERE u.id = :usuario_id
              AND u.ativo = 1
              AND u.perfil IN (
                    'admin',
                    'professor',
                    'aluno',
                    'responsavel'
              )

            LIMIT 1
        "
    );

    $stmt->execute([
        ':usuario_id' => $contatoUsuarioId
    ]);

    $row = $stmt->fetch();

    if (!$row) {
        return null;
    }

    $role = (string) $row['perfil'];

    $description =
        match ($role) {
            'admin' =>
                'Administrador',

            'professor' =>
                (string) (
                    $row['professor_disciplinas']
                    ?: 'Professor(a)'
                ),

            'aluno' =>
                'Aluno' .
                (
                    !empty($row['aluno_turma'])
                        ? ' • ' . (string) $row['aluno_turma']
                        : ''
                ),

            'responsavel' =>
                'Responsável',

            default =>
                ucfirst($role)
        };

    return [
        'userId' =>
            (int) $row['id'],

        'name' =>
            (string) $row['nome'],

        'email' =>
            (string) ($row['email'] ?? ''),

        'role' =>
            $role,

        'description' =>
            $description,

        'suspended' =>
            (int) $row['chat_suspenso'] === 1,

        'suspensionReason' =>
            $row['chat_suspensao_motivo']
    ];
}


function primewaySecretariaChatConversa(
    PDO $pdo,
    int $usuarioId,
    int $conversaId
): ?array {

    $stmt = $pdo->prepare(
        "
            SELECT
                c.id,
                c.tipo,

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
                    SELECT u3.id
                    FROM conversa_participantes cp3
                    INNER JOIN usuarios u3
                        ON u3.id = cp3.usuario_id
                    WHERE cp3.conversa_id = c.id
                      AND cp3.usuario_id <> :usuario_id_outro_id
                      AND cp3.ativo = 1
                      AND cp3.saiu_em IS NULL
                    LIMIT 1
                ) AS usuario_outro_id,

                (
                    SELECT u4.perfil
                    FROM conversa_participantes cp4
                    INNER JOIN usuarios u4
                        ON u4.id = cp4.usuario_id
                    WHERE cp4.conversa_id = c.id
                      AND cp4.usuario_id <> :usuario_id_perfil
                      AND cp4.ativo = 1
                      AND cp4.saiu_em IS NULL
                    LIMIT 1
                ) AS perfil_outro,

                (
                    SELECT u5.chat_suspenso
                    FROM conversa_participantes cp5
                    INNER JOIN usuarios u5
                        ON u5.id = cp5.usuario_id
                    WHERE cp5.conversa_id = c.id
                      AND cp5.usuario_id <> :usuario_id_suspenso
                      AND cp5.ativo = 1
                      AND cp5.saiu_em IS NULL
                    LIMIT 1
                ) AS chat_suspenso_outro,

                (
                    SELECT u6.chat_suspensao_motivo
                    FROM conversa_participantes cp6
                    INNER JOIN usuarios u6
                        ON u6.id = cp6.usuario_id
                    WHERE cp6.conversa_id = c.id
                      AND cp6.usuario_id <> :usuario_id_motivo
                      AND cp6.ativo = 1
                      AND cp6.saiu_em IS NULL
                    LIMIT 1
                ) AS chat_suspensao_motivo_outro

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
        ':usuario_id_outro' => $usuarioId,
        ':usuario_id_outro_id' => $usuarioId,
        ':usuario_id_perfil' => $usuarioId,
        ':usuario_id_suspenso' => $usuarioId,
        ':usuario_id_motivo' => $usuarioId,
        ':conversa_id' => $conversaId,
        ':usuario_id_participante' => $usuarioId
    ]);

    $row = $stmt->fetch();

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

        'userId' =>
            isset($row['usuario_outro_id'])
                ? (int) $row['usuario_outro_id']
                : null,

        'role' =>
            (string) ($row['perfil_outro'] ?? ''),

        'suspended' =>
            (int) ($row['chat_suspenso_outro'] ?? 0) === 1,

        'suspensionReason' =>
            $row['chat_suspensao_motivo_outro']
    ];
}

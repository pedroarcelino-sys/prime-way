<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_chat.php';

primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'secretaria'
    ]);

try {

    $pdo =
        primewayPdo();

    $usuarioId =
        (int) $usuario['id'];

    /*====================================================
                        CONTATOS
    ====================================================*/

    $contacts = [];

    $stmtContatos =
        $pdo->prepare(
            "
                SELECT
                    u.id,
                    u.perfil,
                    u.email,
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
                        INNER JOIN anos_letivos al
                            ON al.id = t.ano_letivo_id
                           AND al.ativo = 1
                        WHERE a.pessoa_id = u.pessoa_id
                          AND a.status = 'ativo'
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
                        INNER JOIN turmas t2
                            ON t2.id = td.turma_id
                        INNER JOIN anos_letivos al2
                            ON al2.id = t2.ano_letivo_id
                           AND al2.ativo = 1
                        WHERE pr.pessoa_id = u.pessoa_id
                          AND pr.status = 'ativo'
                    ) AS professor_disciplinas

                FROM usuarios u

                LEFT JOIN pessoas pe
                    ON pe.id = u.pessoa_id

                WHERE u.ativo = 1
                  AND u.id <> :usuario_id
                  AND u.perfil IN (
                        'admin',
                        'professor',
                        'aluno',
                        'responsavel'
                  )

                ORDER BY
                    FIELD(
                        u.perfil,
                        'admin',
                        'professor',
                        'responsavel',
                        'aluno'
                    ),
                    nome ASC
            "
        );

    $stmtContatos->execute([
        ':usuario_id' =>
            $usuarioId
    ]);

    foreach ($stmtContatos->fetchAll() as $row) {

        $role =
            (string) $row['perfil'];

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
                            ? ' • ' .
                              (string) $row['aluno_turma']
                            : ''
                    ),

                'responsavel' =>
                    'Responsável',

                default =>
                    ucfirst($role)
            };

        $contacts[] = [
            'userId' =>
                (int) $row['id'],

            'name' =>
                (string) $row['nome'],

            'email' =>
                (string) ($row['email'] ?? ''),

            'role' =>
                $role,

            'description' =>
                $description
        ];
    }

    /*====================================================
                        CONVERSAS
    ====================================================*/

    $stmtConversas =
        $pdo->prepare(
            "
                SELECT
                    c.id,

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
                              AND cp2.usuario_id <> :usuario_id_nome
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
                    ) AS perfil_outro,

                    (
                        SELECT
                            COALESCE(
                                NULLIF(m.conteudo, ''),
                                'Mensagem'
                            )

                        FROM mensagens m

                        WHERE m.conversa_id = c.id
                          AND m.excluida_em IS NULL

                        ORDER BY
                            m.enviada_em DESC,
                            m.id DESC

                        LIMIT 1
                    ) AS ultima_mensagem,

                    (
                        SELECT
                            m2.enviada_em

                        FROM mensagens m2

                        WHERE m2.conversa_id = c.id
                          AND m2.excluida_em IS NULL

                        ORDER BY
                            m2.enviada_em DESC,
                            m2.id DESC

                        LIMIT 1
                    ) AS ultima_mensagem_em,

                    (
                        SELECT COUNT(*)

                        FROM mensagens m3

                        LEFT JOIN mensagem_leituras ml
                            ON ml.mensagem_id = m3.id
                           AND ml.usuario_id = :usuario_id_leitura

                        WHERE m3.conversa_id = c.id
                          AND m3.excluida_em IS NULL
                          AND m3.remetente_usuario_id <> :usuario_id_remetente
                          AND ml.id IS NULL
                    ) AS nao_lidas

                FROM conversas c

                INNER JOIN conversa_participantes cp
                    ON cp.conversa_id = c.id

                WHERE cp.usuario_id = :usuario_id_participante
                  AND cp.ativo = 1
                  AND cp.saiu_em IS NULL
                  AND cp.arquivada_em IS NULL
                  AND c.ativo = 1

                ORDER BY
                    COALESCE(
                        ultima_mensagem_em,
                        c.atualizado_em
                    ) DESC,
                    c.id DESC
            "
        );

    $stmtConversas->execute([
        ':usuario_id_nome' =>
            $usuarioId,

        ':usuario_id_perfil' =>
            $usuarioId,

        ':usuario_id_leitura' =>
            $usuarioId,

        ':usuario_id_remetente' =>
            $usuarioId,

        ':usuario_id_participante' =>
            $usuarioId
    ]);

    $conversations =
        array_map(
            static fn (
                array $row
            ): array => [
                'id' =>
                    (int) $row['id'],

                'title' =>
                    (string) $row['titulo_exibicao'],

                'role' =>
                    (string) (
                        $row['perfil_outro']
                        ?? ''
                    ),

                'lastMessage' =>
                    (string) (
                        $row['ultima_mensagem']
                        ?? ''
                    ),

                'lastMessageAt' =>
                    $row['ultima_mensagem_em'],

                'unread' =>
                    (int) $row['nao_lidas']
            ],
            $stmtConversas->fetchAll()
        );

    primewayResponderJson([
        'success' =>
            true,

        'contacts' =>
            $contacts,

        'conversations' =>
            $conversations
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Secretaria Chat GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            'Não foi possível carregar o chat da Secretaria.'
    ], 500);
}

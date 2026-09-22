<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';
require_once __DIR__ . '/_chat.php';

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

    $usuarioId =
        (int) $usuario['id'];

    $turmas =
        primewayProfessorChatTurmasIds(
            $pdo,
            $professorId
        );

    $contacts =
        [];

    if ($turmas !== []) {

        $placeholders =
            implode(
                ',',
                array_fill(
                    0,
                    count($turmas),
                    '?'
                )
            );

        $stmtAlunos =
            $pdo->prepare(
                "
                    SELECT DISTINCT
                        u.id AS usuario_id,
                        pe.nome,
                        t.nome AS turma_nome

                    FROM matriculas m

                    INNER JOIN alunos a
                        ON a.id = m.aluno_id
                       AND a.status = 'ativo'

                    INNER JOIN pessoas pe
                        ON pe.id = a.pessoa_id
                       AND pe.ativo = 1

                    INNER JOIN usuarios u
                        ON u.pessoa_id = pe.id
                       AND u.perfil = 'aluno'
                       AND u.ativo = 1

                    INNER JOIN turmas t
                        ON t.id = m.turma_id

                    WHERE m.situacao = 'Ativa'
                      AND m.turma_id IN (
                            {$placeholders}
                      )

                    ORDER BY
                        pe.nome ASC
                "
            );

        $stmtAlunos->execute(
            $turmas
        );

        foreach (
            $stmtAlunos->fetchAll()
            as $row
        ) {
            $contacts[
                (int) $row['usuario_id']
            ] = [
                'userId' =>
                    (int) $row['usuario_id'],

                'name' =>
                    (string) $row['nome'],

                'role' =>
                    'aluno',

                'description' =>
                    'Aluno • ' .
                    (string) $row['turma_nome']
            ];
        }

        $stmtResponsaveis =
            $pdo->prepare(
                "
                    SELECT DISTINCT
                        u.id AS usuario_id,
                        pe.nome,
                        aluno_pe.nome AS aluno_nome,
                        t.nome AS turma_nome

                    FROM matriculas m

                    INNER JOIN alunos a
                        ON a.id = m.aluno_id
                       AND a.status = 'ativo'

                    INNER JOIN pessoas aluno_pe
                        ON aluno_pe.id = a.pessoa_id

                    INNER JOIN aluno_responsavel ar
                        ON ar.aluno_id = a.id
                       AND ar.ativo = 1

                    INNER JOIN responsaveis r
                        ON r.id = ar.responsavel_id
                       AND r.status <> 'inativo'

                    INNER JOIN pessoas pe
                        ON pe.id = r.pessoa_id
                       AND pe.ativo = 1

                    INNER JOIN usuarios u
                        ON u.pessoa_id = pe.id
                       AND u.perfil = 'responsavel'
                       AND u.ativo = 1

                    INNER JOIN turmas t
                        ON t.id = m.turma_id

                    WHERE m.situacao = 'Ativa'
                      AND m.turma_id IN (
                            {$placeholders}
                      )

                    ORDER BY
                        pe.nome ASC,
                        aluno_pe.nome ASC
                "
            );

        $stmtResponsaveis->execute(
            $turmas
        );

        foreach (
            $stmtResponsaveis->fetchAll()
            as $row
        ) {
            $id =
                (int) $row['usuario_id'];

            if (!isset($contacts[$id])) {
                $contacts[$id] = [
                    'userId' =>
                        $id,

                    'name' =>
                        (string) $row['nome'],

                    'role' =>
                        'responsavel',

                    'description' =>
                        'Responsável de ' .
                        (string) $row['aluno_nome'] .
                        ' • ' .
                        (string) $row['turma_nome']
                ];
            }
        }
    }

    $stmtSecretaria =
        $pdo->query(
            "
                SELECT
                    u.id AS usuario_id,

                    COALESCE(
                        pe.nome,
                        u.nome,
                        u.email
                    ) AS nome

                FROM usuarios u

                LEFT JOIN pessoas pe
                    ON pe.id = u.pessoa_id

                WHERE u.perfil = 'secretaria'
                  AND u.ativo = 1

                ORDER BY nome ASC
            "
        );

    foreach (
        $stmtSecretaria->fetchAll()
        as $row
    ) {

        $contacts[
            (int) $row['usuario_id']
        ] = [
            'userId' =>
                (int) $row['usuario_id'],

            'name' =>
                (string) $row['nome'],

            'role' =>
                'secretaria',

            'description' =>
                'Secretaria'
        ];
    }

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
        'success' => true,
        'contacts' =>
            array_values(
                $contacts
            ),
        'conversations' =>
            $conversations,
        'csrfToken' =>
            primewayTokenCsrf()
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Professor Chat GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar o chat.'
        ],
        500
    );
}

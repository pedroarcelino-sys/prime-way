<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_chat.php';

primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'aluno'
    ]);

$conversaId =
    primewayIdPositivo(
        $_GET['conversationId']
        ?? null
    );

if ($conversaId === null) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Conversa inválida.'
        ],
        422
    );
}

try {

    $pdo =
        primewayPdo();

    $usuarioId =
        (int) $usuario['id'];

    $conversa =
        primewayAlunoChatConversa(
            $pdo,
            $usuarioId,
            $conversaId
        );

    if (!$conversa) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Conversa não encontrada.'
            ],
            404
        );
    }

    $stmt =
        $pdo->prepare(
            "
                SELECT
                    m.id,
                    m.remetente_usuario_id,
                    m.conteudo,
                    m.tipo,
                    m.enviada_em,
                    m.editada_em,

                    COALESCE(
                        pe.nome,
                        u.nome,
                        u.email
                    ) AS remetente_nome

                FROM mensagens m

                INNER JOIN usuarios u
                    ON u.id = m.remetente_usuario_id

                LEFT JOIN pessoas pe
                    ON pe.id = u.pessoa_id

                WHERE m.conversa_id = :conversa_id
                  AND m.excluida_em IS NULL

                ORDER BY
                    m.enviada_em DESC,
                    m.id DESC

                LIMIT 200
            "
        );

    $stmt->execute([
        ':conversa_id' =>
            $conversaId
    ]);

    $rows =
        array_reverse(
            $stmt->fetchAll()
        );

    $messages =
        array_map(
            static fn (
                array $row
            ): array => [
                'id' =>
                    (int) $row['id'],

                'senderUserId' =>
                    (int) $row['remetente_usuario_id'],

                'senderName' =>
                    (string) $row['remetente_nome'],

                'content' =>
                    (string) (
                        $row['conteudo']
                        ?? ''
                    ),

                'type' =>
                    (string) $row['tipo'],

                'sentAt' =>
                    (string) $row['enviada_em'],

                'editedAt' =>
                    $row['editada_em'],

                'own' =>
                    (int) $row['remetente_usuario_id']
                    ===
                    (int) $usuario['id']
            ],
            $rows
        );

    primewayResponderJson([
        'success' => true,
        'conversation' =>
            $conversa,
        'messages' =>
            $messages
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Aluno Chat Mensagens GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar as mensagens.'
        ],
        500
    );
}

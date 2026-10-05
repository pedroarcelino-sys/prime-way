<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../../chat/_attachments.php';
require_once __DIR__ . '/_chat.php';

primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'secretaria'
    ]);

$conversaId =
    primewayIdPositivo(
        $_GET['conversationId']
        ?? null
    );

if ($conversaId === null) {
    primewayResponderJson([
        'success' => false,
        'message' =>
            'Conversa inválida.'
    ], 422);
}

try {

    $pdo =
        primewayPdo();

    $usuarioId =
        (int) $usuario['id'];

    $conversa =
        primewaySecretariaChatConversa(
            $pdo,
            $usuarioId,
            $conversaId
        );

    if (!$conversa) {
        primewayResponderJson([
            'success' => false,
            'message' =>
                'Conversa não encontrada.'
        ], 404);
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

    $attachmentsByMessage = [];
    $messageIds = array_map(
        static fn (array $row): int => (int) $row['id'],
        $rows
    );

    if ($messageIds) {
        $placeholders = implode(',', array_fill(0, count($messageIds), '?'));
        $stmtAttachments = $pdo->prepare(
            "
                SELECT
                    id,
                    mensagem_id,
                    nome_original,
                    mime_type,
                    tamanho_bytes
                FROM mensagem_anexos
                WHERE mensagem_id IN ($placeholders)
                ORDER BY id ASC
            "
        );

        $stmtAttachments->execute($messageIds);

        foreach ($stmtAttachments->fetchAll() as $attachment) {
            $messageId = (int) $attachment['mensagem_id'];
            $mimeType = (string) ($attachment['mime_type'] ?? 'application/octet-stream');
            $attachmentId = (int) $attachment['id'];

            $attachmentsByMessage[$messageId][] = [
                'id' => $attachmentId,
                'name' => (string) $attachment['nome_original'],
                'mimeType' => $mimeType,
                'size' => (int) ($attachment['tamanho_bytes'] ?? 0),
                'kind' => primewayChatAttachmentKind($mimeType),
                'url' => '../api/chat/arquivo.php?attachmentId=' . $attachmentId,
                'downloadUrl' => '../api/chat/arquivo.php?attachmentId=' . $attachmentId . '&download=1'
            ];
        }
    }

    $messages =
        array_map(
            static function (array $row) use ($usuario, $attachmentsByMessage): array {
                $messageId = (int) $row['id'];

                return [
                    'id' =>
                        $messageId,

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

                    'attachments' =>
                        $attachmentsByMessage[$messageId] ?? [],

                    'sentAt' =>
                        (string) $row['enviada_em'],

                    'editedAt' =>
                        $row['editada_em'],

                    'own' =>
                        (int) $row['remetente_usuario_id']
                        ===
                        (int) $usuario['id']
                ];
            },
            $rows
        );

    primewayResponderJson([
        'success' =>
            true,

        'conversation' =>
            $conversa,

        'messages' =>
            $messages
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Secretaria Chat Mensagens GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' =>
            'Não foi possível carregar as mensagens.'
    ], 500);
}

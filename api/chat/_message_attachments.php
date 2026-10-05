<?php

declare(strict_types=1);

require_once __DIR__ . '/_attachments.php';

/**
 * @param array<int, int|string> $messageIds
 * @return array<int, array<int, array<string, mixed>>>
 */
function primewayChatAttachmentsByMessage(
    PDO $pdo,
    array $messageIds
): array {
    $ids = [];

    foreach ($messageIds as $messageId) {
        $id = (int) $messageId;

        if ($id > 0) {
            $ids[$id] = $id;
        }
    }

    $ids = array_values($ids);

    if (!$ids) {
        return [];
    }

    $placeholders = implode(
        ',',
        array_fill(0, count($ids), '?')
    );

    $stmt = $pdo->prepare(
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

    $stmt->execute($ids);

    $attachmentsByMessage = [];

    foreach ($stmt->fetchAll() as $attachment) {
        $messageId = (int) $attachment['mensagem_id'];
        $attachmentId = (int) $attachment['id'];
        $mimeType = (string) (
            $attachment['mime_type']
            ?? 'application/octet-stream'
        );

        $attachmentsByMessage[$messageId][] = [
            'id' => $attachmentId,
            'name' => (string) $attachment['nome_original'],
            'mimeType' => $mimeType,
            'size' => (int) (
                $attachment['tamanho_bytes']
                ?? 0
            ),
            'kind' => primewayChatAttachmentKind($mimeType),
            'url' => '../api/chat/arquivo.php?attachmentId=' . $attachmentId,
            'downloadUrl' => '../api/chat/arquivo.php?attachmentId=' . $attachmentId . '&download=1'
        ];
    }

    return $attachmentsByMessage;
}

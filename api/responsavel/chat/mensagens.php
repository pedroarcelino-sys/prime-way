<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../../chat/_message_attachments.php';
require_once __DIR__ . '/_chat.php';

primewayExigirMetodo('GET');

$usuario = primewayExigirPerfis(['responsavel']);
$conversationId = primewayIdPositivo($_GET['conversationId'] ?? null);

if ($conversationId === null) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Conversa inválida.'
    ], 422);
}

try {
    $pdo = primewayPdo();
    $usuarioId = (int) $usuario['id'];

    $conversation = primewayResponsavelChatConversa($pdo, $usuarioId, $conversationId);

    if (!$conversation) {
        primewayResponderJson([
            'success' => false,
            'message' => 'Conversa não encontrada.'
        ], 404);
    }

    $stmt = $pdo->prepare(
        "
            SELECT
                m.id,
                m.remetente_usuario_id,
                m.conteudo,
                m.tipo,
                m.enviada_em,
                m.editada_em,
                m.fixada_em,
                m.fixada_por_usuario_id,
                COALESCE(pe.nome, u.nome, u.email) AS remetente_nome
            FROM mensagens m
            INNER JOIN usuarios u
                ON u.id = m.remetente_usuario_id
            LEFT JOIN pessoas pe
                ON pe.id = u.pessoa_id
            WHERE m.conversa_id = :conversa_id
              AND m.excluida_em IS NULL
            ORDER BY m.enviada_em DESC, m.id DESC
            LIMIT 200
        "
    );

    $stmt->execute([':conversa_id' => $conversationId]);
    $rows = array_reverse($stmt->fetchAll());

    $attachmentsByMessage = primewayChatAttachmentsByMessage(
        $pdo,
        array_map(static fn (array $row): int => (int) $row['id'], $rows)
    );

    $messages = array_map(
        static function (array $row) use ($usuario, $attachmentsByMessage): array {
            $messageId = (int) $row['id'];

            return [
                'id' => $messageId,
                'senderUserId' => (int) $row['remetente_usuario_id'],
                'senderName' => (string) $row['remetente_nome'],
                'content' => (string) ($row['conteudo'] ?? ''),
                'type' => (string) $row['tipo'],
                'attachments' => $attachmentsByMessage[$messageId] ?? [],
                'sentAt' => (string) $row['enviada_em'],
                'editedAt' => $row['editada_em'],
                'pinned' => $row['fixada_em'] !== null,
                'pinnedAt' => $row['fixada_em'],
                'pinnedByUserId' => $row['fixada_por_usuario_id'] !== null
                    ? (int) $row['fixada_por_usuario_id']
                    : null,
                'own' => (int) $row['remetente_usuario_id'] === (int) $usuario['id']
            ];
        },
        $rows
    );

    primewayResponderJson([
        'success' => true,
        'conversation' => $conversation,
        'messages' => $messages
    ]);

} catch (Throwable $erro) {
    error_log('PrimeWay Responsável Chat Mensagens GET: ' . $erro->getMessage());

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível carregar as mensagens.'
    ], 500);
}

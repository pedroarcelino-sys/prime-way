<?php

declare(strict_types=1);

function primewayChatStatus(
    PDO $pdo,
    int $usuarioId
): array {
    $stmt = $pdo->prepare(
        "
            SELECT
                chat_suspenso,
                chat_suspenso_em,
                chat_suspensao_motivo
            FROM usuarios
            WHERE id = :usuario_id
            LIMIT 1
        "
    );

    $stmt->execute([
        ':usuario_id' => $usuarioId
    ]);

    $row = $stmt->fetch();

    if (!$row) {
        return [
            'suspended' => false,
            'suspendedAt' => null,
            'reason' => null
        ];
    }

    return [
        'suspended' => (int) $row['chat_suspenso'] === 1,
        'suspendedAt' => $row['chat_suspenso_em'],
        'reason' => $row['chat_suspensao_motivo']
    ];
}

function primewayChatExigirDisponivel(
    PDO $pdo,
    int $usuarioId
): void {
    $status = primewayChatStatus(
        $pdo,
        $usuarioId
    );

    if (!$status['suspended']) {
        return;
    }

    $mensagem =
        'Seu acesso ao chat está suspenso pela Secretaria.';

    if (!empty($status['reason'])) {
        $mensagem .= ' Motivo: ' . $status['reason'];
    }

    primewayResponderJson([
        'success' => false,
        'code' => 'CHAT_SUSPENSO',
        'message' => $mensagem,
        'chatSuspended' => true,
        'suspendedAt' => $status['suspendedAt'],
        'reason' => $status['reason']
    ], 403);
}

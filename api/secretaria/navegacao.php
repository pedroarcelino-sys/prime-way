<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';

primewayExigirMetodo('GET');

$usuario = primewayExigirPerfis([
    'secretaria'
]);

try {

    $pdo = primewayPdo();

    $stmtUnread = $pdo->prepare(
        "
            SELECT COUNT(*)
            FROM notificacao_destinatarios
            WHERE usuario_id = :usuario_id
              AND lida_em IS NULL
              AND excluida_em IS NULL
        "
    );

    $stmtUnread->execute([
        ':usuario_id' => (int) $usuario['id']
    ]);

    $activePickup = (int) $pdo
        ->query(
            "
                SELECT COUNT(*)
                FROM solicitacoes_saida_segura
                WHERE status IN (
                    'Aguardando',
                    'No raio',
                    'Preparando'
                )
            "
        )
        ->fetchColumn();

    $insideRadius = (int) $pdo
        ->query(
            "
                SELECT COUNT(*)
                FROM solicitacoes_saida_segura
                WHERE status = 'No raio'
            "
        )
        ->fetchColumn();

    primewayResponderJson([
        'success' => true,
        'unreadNotifications' =>
            (int) $stmtUnread->fetchColumn(),
        'activePickup' => $activePickup,
        'insideRadius' => $insideRadius
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Secretaria Navegação GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' =>
            'Não foi possível atualizar os indicadores da Secretaria.'
    ], 500);
}

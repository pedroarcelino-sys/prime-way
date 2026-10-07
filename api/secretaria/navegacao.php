<?php

declare(strict_types=1);
require_once __DIR__.'/../notificacoes/_notificacoes.php';

require_once __DIR__ . '/../_bootstrap.php';

primewayExigirMetodo('GET');

$usuario = primewayExigirPerfis([
    'secretaria'
]);

try {

    $pdo = primewayPdo();

    $usuarioId =
        (int) $usuario['id'];

    $unreadNotifications=primewayNotificationUnread($pdo,$usuario);

    $stmtUnreadChat =
        $pdo->prepare(
            "
                SELECT COUNT(*)

                FROM mensagens m

                INNER JOIN conversa_participantes cp
                    ON cp.conversa_id = m.conversa_id
                   AND cp.usuario_id = :usuario_id_participante
                   AND cp.ativo = 1
                   AND cp.saiu_em IS NULL
                   AND cp.arquivada_em IS NULL

                INNER JOIN conversas c
                    ON c.id = m.conversa_id
                   AND c.ativo = 1

                LEFT JOIN mensagem_leituras ml
                    ON ml.mensagem_id = m.id
                   AND ml.usuario_id = :usuario_id_leitura

                WHERE m.excluida_em IS NULL
                  AND m.remetente_usuario_id <> :usuario_id_remetente
                  AND ml.id IS NULL
            "
        );

    $stmtUnreadChat->execute([
        ':usuario_id_participante' =>
            $usuarioId,

        ':usuario_id_leitura' =>
            $usuarioId,

        ':usuario_id_remetente' =>
            $usuarioId
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
        'success' =>
            true,

        'unreadNotifications' =>
            $unreadNotifications,

        'unreadChat' =>
            (int) $stmtUnreadChat->fetchColumn(),

        'activePickup' =>
            $activePickup,

        'insideRadius' =>
            $insideRadius
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

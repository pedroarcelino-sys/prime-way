<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'secretaria'
    ]);

primewayExigirCsrf();

$dados =
    primewayLerJson();

$notificationId =
    primewayIdPositivo(
        $dados['notificationId']
        ?? null
    );

if ($notificationId === null) {
    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            'Notificação inválida.'
    ], 422);
}

try {

    $pdo =
        primewayPdo();

    $usuarioId =
        (int) $usuario['id'];

    $stmt =
        $pdo->prepare(
            "
                SELECT
                    n.id,
                    nd.id AS destinatario_id

                FROM notificacoes n

                LEFT JOIN notificacao_destinatarios nd
                    ON nd.notificacao_id = n.id
                   AND nd.usuario_id =
                        :usuario_id

                WHERE n.id =
                    :notificacao_id

                  AND n.status =
                    'Publicada'

                  AND COALESCE(
                        n.publicada_em,
                        n.criado_em
                      ) <= CURRENT_TIMESTAMP

                  AND (
                        (
                            nd.id IS NOT NULL
                            AND nd.excluida_em IS NULL
                        )

                        OR

                        (
                            nd.id IS NULL
                            AND LOWER(n.publico) IN (
                                'todos',
                                'secretaria',
                                'secretária'
                            )
                        )
                      )

                LIMIT 1
            "
        );

    $stmt->execute([
        ':usuario_id' =>
            $usuarioId,

        ':notificacao_id' =>
            $notificationId
    ]);

    $row =
        $stmt->fetch();

    if (!$row) {
        primewayResponderJson([
            'success' =>
                false,

            'message' =>
                'Notificação não encontrada.'
        ], 404);
    }

    if (
        $row['destinatario_id']
        === null
    ) {

        $stmtRecipient =
            $pdo->prepare(
                "
                    INSERT INTO notificacao_destinatarios (
                        notificacao_id,
                        usuario_id,
                        recebida_em,
                        lida_em
                    )
                    VALUES (
                        :notificacao_id,
                        :usuario_id,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                "
            );

        $stmtRecipient->execute([
            ':notificacao_id' =>
                $notificationId,

            ':usuario_id' =>
                $usuarioId
        ]);

    } else {

        $stmtRead =
            $pdo->prepare(
                "
                    UPDATE notificacao_destinatarios

                    SET lida_em =
                        COALESCE(
                            lida_em,
                            CURRENT_TIMESTAMP
                        )

                    WHERE id =
                        :destinatario_id
                "
            );

        $stmtRead->execute([
            ':destinatario_id' =>
                (int) $row['destinatario_id']
        ]);
    }

    primewayResponderJson([
        'success' =>
            true
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Secretaria Notificação Marcar Lida: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            'Não foi possível atualizar a notificação.'
    ], 500);
}

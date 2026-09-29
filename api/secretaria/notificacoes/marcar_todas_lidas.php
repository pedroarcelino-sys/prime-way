<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'secretaria'
    ]);

primewayExigirCsrf();

try {

    $pdo =
        primewayPdo();

    $usuarioId =
        (int) $usuario['id'];

    $pdo->beginTransaction();

    $stmtPublic =
        $pdo->prepare(
            "
                SELECT
                    n.id

                FROM notificacoes n

                LEFT JOIN notificacao_destinatarios nd
                    ON nd.notificacao_id = n.id
                   AND nd.usuario_id =
                        :usuario_id

                WHERE n.status =
                    'Publicada'

                  AND COALESCE(
                        n.publicada_em,
                        n.criado_em
                      ) <= CURRENT_TIMESTAMP

                  AND (
                        (
                            nd.id IS NOT NULL
                            AND nd.excluida_em IS NULL
                            AND nd.lida_em IS NULL
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
            "
        );

    $stmtPublic->execute([
        ':usuario_id' =>
            $usuarioId
    ]);

    $notificationIds =
        array_map(
            static fn (
                array $row
            ): int =>
                (int) $row['id'],
            $stmtPublic->fetchAll()
        );

    if ($notificationIds !== []) {

        $stmtUpsert =
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
                    ON DUPLICATE KEY UPDATE
                        lida_em =
                            COALESCE(
                                lida_em,
                                CURRENT_TIMESTAMP
                            ),
                        excluida_em =
                            NULL
                "
            );

        foreach (
            $notificationIds
            as $notificationId
        ) {

            $stmtUpsert->execute([
                ':notificacao_id' =>
                    $notificationId,

                ':usuario_id' =>
                    $usuarioId
            ]);
        }
    }

    $pdo->commit();

    primewayResponderJson([
        'success' =>
            true,

        'updated' =>
            count(
                $notificationIds
            )
    ]);

} catch (Throwable $erro) {

    if (
        isset($pdo)
        &&
        $pdo instanceof PDO
        &&
        $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }

    error_log(
        'PrimeWay Secretaria Notificações Marcar Todas: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            'Não foi possível atualizar as notificações.'
    ], 500);
}

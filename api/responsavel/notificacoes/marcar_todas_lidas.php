<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'responsavel'
    ]);

primewayExigirCsrf();

try {

    $pdo =
        primewayPdo();

    $usuarioId =
        (int) $usuario['id'];

    $pdo->beginTransaction();

    $stmt =
        $pdo->prepare(
            "
                SELECT n.id

                FROM notificacoes n

                LEFT JOIN notificacao_destinatarios nd
                    ON nd.notificacao_id = n.id
                   AND nd.usuario_id = :usuario_id

                WHERE n.status = 'Publicada'

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
                                'responsáveis',
                                'responsaveis',
                                'responsável',
                                'responsavel'
                            )
                        )
                      )
            "
        );

    $stmt->execute([
        ':usuario_id' =>
            $usuarioId
    ]);

    $ids =
        array_map(
            static fn (array $row): int =>
                (int) $row['id'],
            $stmt->fetchAll()
        );

    $save =
        $pdo->prepare(
            "
                INSERT INTO notificacao_destinatarios (
                    notificacao_id,
                    usuario_id,
                    recebida_em,
                    lida_em,
                    excluida_em
                )
                VALUES (
                    :notificacao_id,
                    :usuario_id,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    NULL
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

    foreach ($ids as $id) {
        $save->execute([
            ':notificacao_id' =>
                $id,
            ':usuario_id' =>
                $usuarioId
        ]);
    }

    $pdo->commit();

    primewayResponderJson([
        'success' => true,
        'updated' =>
            count($ids)
    ]);

} catch (Throwable $erro) {

    if (
        isset($pdo) &&
        $pdo instanceof PDO &&
        $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }

    error_log(
        'PrimeWay Responsável Notificações Ler Todas POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível atualizar as notificações.'
        ],
        500
    );
}

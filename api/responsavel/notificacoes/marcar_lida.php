<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'responsavel'
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
    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Notificação inválida.'
        ],
        422
    );
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
                    n.id

                FROM notificacoes n

                LEFT JOIN notificacao_destinatarios nd
                    ON nd.notificacao_id = n.id
                   AND nd.usuario_id = :usuario_id

                WHERE n.id = :notificacao_id
                  AND n.status = 'Publicada'

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

                LIMIT 1
            "
        );

    $stmt->execute([
        ':usuario_id' =>
            $usuarioId,

        ':notificacao_id' =>
            $notificationId
    ]);

    if (!$stmt->fetch()) {
        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Notificação não encontrada.'
            ],
            404
        );
    }

    $stmtSave =
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

    $stmtSave->execute([
        ':notificacao_id' =>
            $notificationId,

        ':usuario_id' =>
            $usuarioId
    ]);

    primewayResponderJson([
        'success' => true
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Responsável Notificação Ler POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível atualizar a notificação.'
        ],
        500
    );
}

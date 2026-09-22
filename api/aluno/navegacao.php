<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';

primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'aluno'
    ]);

try {

    $pdo =
        primewayPdo();

    $usuarioId =
        (int) $usuario['id'];

    $stmtNotificacoes =
        $pdo->prepare(
            "
                SELECT COUNT(DISTINCT n.id)

                FROM notificacoes n

                LEFT JOIN notificacao_destinatarios nd
                    ON nd.notificacao_id = n.id
                   AND nd.usuario_id = :usuario_id

                WHERE n.status = 'Publicada'

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
                                'alunos',
                                'aluno'
                            )
                        )
                      )
            "
        );

    $stmtNotificacoes->execute([
        ':usuario_id' =>
            $usuarioId
    ]);

    $unreadNotifications =
        (int) $stmtNotificacoes->fetchColumn();

    $stmtMensagens =
        $pdo->prepare(
            "
                SELECT COUNT(DISTINCT m.id)

                FROM conversa_participantes cp

                INNER JOIN conversas c
                    ON c.id = cp.conversa_id
                   AND c.ativo = 1

                INNER JOIN mensagens m
                    ON m.conversa_id = c.id
                   AND m.excluida_em IS NULL
                   AND m.remetente_usuario_id <> :usuario_id_mensagem

                LEFT JOIN mensagem_leituras ml
                    ON ml.mensagem_id = m.id
                   AND ml.usuario_id = :usuario_id_leitura

                WHERE cp.usuario_id = :usuario_id_participante
                  AND cp.ativo = 1
                  AND cp.saiu_em IS NULL
                  AND cp.arquivada_em IS NULL
                  AND ml.id IS NULL
            "
        );

    $stmtMensagens->execute([
        ':usuario_id_mensagem' =>
            $usuarioId,

        ':usuario_id_leitura' =>
            $usuarioId,

        ':usuario_id_participante' =>
            $usuarioId
    ]);

    $unreadMessages =
        (int) $stmtMensagens->fetchColumn();

    primewayResponderJson([
        'success' => true,
        'unreadNotifications' =>
            $unreadNotifications,
        'unreadMessages' =>
            $unreadMessages
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Aluno Navegação GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar os contadores da navegação.'
        ],
        500
    );
}

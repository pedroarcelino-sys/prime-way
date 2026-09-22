<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

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

    $stmt =
        $pdo->prepare(
            "
                SELECT
                    n.id,
                    n.titulo,
                    n.tipo,
                    n.publico,
                    n.mensagem,
                    n.origem,
                    COALESCE(
                        n.publicada_em,
                        n.criado_em
                    ) AS data_notificacao,

                    nd.id AS destinatario_id,
                    nd.recebida_em,
                    nd.lida_em,
                    nd.excluida_em

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

                ORDER BY
                    COALESCE(
                        n.publicada_em,
                        n.criado_em
                    ) DESC,
                    n.id DESC

                LIMIT 150
            "
        );

    $stmt->execute([
        ':usuario_id' =>
            $usuarioId
    ]);

    $notifications =
        [];

    foreach (
        $stmt->fetchAll()
        as $row
    ) {

        $notifications[] = [
            'id' =>
                (int) $row['id'],

            'title' =>
                (string) $row['titulo'],

            'type' =>
                (string) $row['tipo'],

            'audience' =>
                (string) $row['publico'],

            'message' =>
                (string) $row['mensagem'],

            'origin' =>
                (string) $row['origem'],

            'date' =>
                (string) $row['data_notificacao'],

            'read' =>
                $row['lida_em'] !== null
        ];
    }

    primewayResponderJson([
        'success' => true,
        'notifications' =>
            $notifications
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Aluno Notificações GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar as notificações.'
        ],
        500
    );
}

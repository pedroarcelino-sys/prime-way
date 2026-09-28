<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'responsavel'
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

                    nd.lida_em,

                    COALESCE(
                        pe.nome,
                        u.nome,
                        u.email,
                        'Sistema'
                    ) AS autor_nome,

                    COALESCE(
                        u.perfil,
                        'sistema'
                    ) AS autor_perfil

                FROM notificacoes n

                LEFT JOIN notificacao_destinatarios nd
                    ON nd.notificacao_id = n.id
                   AND nd.usuario_id = :usuario_id

                LEFT JOIN usuarios u
                    ON u.id =
                       n.criado_por_usuario_id

                LEFT JOIN pessoas pe
                    ON pe.id =
                       u.pessoa_id

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
                                'responsáveis',
                                'responsaveis',
                                'responsável',
                                'responsavel'
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
        array_map(
            static fn (
                array $row
            ): array => [
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

                'author' =>
                    (string) $row['autor_nome'],

                'authorRole' =>
                    (string) $row['autor_perfil'],

                'read' =>
                    $row['lida_em'] !== null
            ],
            $stmt->fetchAll()
        );

    primewayResponderJson([
        'success' => true,
        'notifications' =>
            $notifications
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Responsável Notificações GET: ' .
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

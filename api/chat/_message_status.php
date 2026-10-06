<?php

declare(strict_types=1);

/**
 * Registra como entregues as mensagens recebidas pelo usuário.
 *
 * Quando $conversationId é informado, limita o registro àquela conversa.
 * Caso contrário, considera todas as conversas ativas do usuário.
 */
function primewayChatMarcarEntregues(
    PDO $pdo,
    int $usuarioId,
    ?int $conversationId = null
): void {
    if ($usuarioId <= 0) {
        return;
    }

    $conversationFilter = $conversationId !== null
        ? ' AND m.conversa_id = :conversa_id '
        : '';

    $sql = "
        INSERT IGNORE INTO mensagem_entregas (
            mensagem_id,
            usuario_id,
            entregue_em
        )
        SELECT
            m.id,
            :usuario_id_insert,
            CURRENT_TIMESTAMP
        FROM mensagens m
        INNER JOIN conversas c
            ON c.id = m.conversa_id
           AND c.ativo = 1
        INNER JOIN conversa_participantes cp
            ON cp.conversa_id = m.conversa_id
           AND cp.usuario_id = :usuario_id_participante
           AND cp.ativo = 1
           AND cp.saiu_em IS NULL
        LEFT JOIN mensagem_entregas me
            ON me.mensagem_id = m.id
           AND me.usuario_id = :usuario_id_entrega
        WHERE m.excluida_em IS NULL
          AND m.remetente_usuario_id <> :usuario_id_remetente
          AND me.id IS NULL
          {$conversationFilter}
    ";

    $stmt = $pdo->prepare($sql);

    $params = [
        ':usuario_id_insert' => $usuarioId,
        ':usuario_id_participante' => $usuarioId,
        ':usuario_id_entrega' => $usuarioId,
        ':usuario_id_remetente' => $usuarioId
    ];

    if ($conversationId !== null) {
        $params[':conversa_id'] = $conversationId;
    }

    $stmt->execute($params);
}

/**
 * @param array<int, int|string> $messageIds
 * @return array<int, array<string, mixed>>
 */
function primewayChatStatusMensagens(
    PDO $pdo,
    array $messageIds
): array {
    $ids = [];

    foreach ($messageIds as $messageId) {
        $id = (int) $messageId;

        if ($id > 0) {
            $ids[$id] = $id;
        }
    }

    $ids = array_values($ids);

    if ($ids === []) {
        return [];
    }

    $placeholders = implode(
        ',',
        array_fill(0, count($ids), '?')
    );

    $stmt = $pdo->prepare(
        "
            SELECT
                m.id,

                (
                    SELECT COUNT(*)
                    FROM conversa_participantes cp
                    WHERE cp.conversa_id = m.conversa_id
                      AND cp.usuario_id <> m.remetente_usuario_id
                      AND cp.ativo = 1
                      AND cp.saiu_em IS NULL
                ) AS destinatarios,

                (
                    SELECT COUNT(*)
                    FROM mensagem_entregas me
                    INNER JOIN conversa_participantes cp2
                        ON cp2.conversa_id = m.conversa_id
                       AND cp2.usuario_id = me.usuario_id
                       AND cp2.ativo = 1
                       AND cp2.saiu_em IS NULL
                    WHERE me.mensagem_id = m.id
                      AND me.usuario_id <> m.remetente_usuario_id
                ) AS entregues,

                (
                    SELECT MAX(me2.entregue_em)
                    FROM mensagem_entregas me2
                    INNER JOIN conversa_participantes cp3
                        ON cp3.conversa_id = m.conversa_id
                       AND cp3.usuario_id = me2.usuario_id
                       AND cp3.ativo = 1
                       AND cp3.saiu_em IS NULL
                    WHERE me2.mensagem_id = m.id
                      AND me2.usuario_id <> m.remetente_usuario_id
                ) AS entregue_em,

                (
                    SELECT COUNT(*)
                    FROM mensagem_leituras ml
                    INNER JOIN conversa_participantes cp4
                        ON cp4.conversa_id = m.conversa_id
                       AND cp4.usuario_id = ml.usuario_id
                       AND cp4.ativo = 1
                       AND cp4.saiu_em IS NULL
                    WHERE ml.mensagem_id = m.id
                      AND ml.usuario_id <> m.remetente_usuario_id
                ) AS lidas,

                (
                    SELECT MAX(ml2.lida_em)
                    FROM mensagem_leituras ml2
                    INNER JOIN conversa_participantes cp5
                        ON cp5.conversa_id = m.conversa_id
                       AND cp5.usuario_id = ml2.usuario_id
                       AND cp5.ativo = 1
                       AND cp5.saiu_em IS NULL
                    WHERE ml2.mensagem_id = m.id
                      AND ml2.usuario_id <> m.remetente_usuario_id
                ) AS lida_em

            FROM mensagens m
            WHERE m.id IN ({$placeholders})
        "
    );

    $stmt->execute($ids);

    $statuses = [];

    foreach ($stmt->fetchAll() as $row) {
        $messageId = (int) $row['id'];
        $recipients = (int) $row['destinatarios'];
        $delivered = (int) $row['entregues'];
        $read = (int) $row['lidas'];

        $status = 'sent';

        if ($recipients > 0 && $read >= $recipients) {
            $status = 'read';
        } elseif ($recipients > 0 && $delivered >= $recipients) {
            $status = 'delivered';
        }

        $statuses[$messageId] = [
            'status' => $status,
            'recipientCount' => $recipients,
            'deliveredCount' => $delivered,
            'readCount' => $read,
            'deliveredAt' => $row['entregue_em'],
            'readAt' => $row['lida_em']
        ];
    }

    return $statuses;
}

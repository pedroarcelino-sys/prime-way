<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/_message_status.php';

primewayExigirMetodo('GET');

$usuario = primewayExigirPerfis([
    'aluno',
    'professor',
    'responsavel',
    'secretaria',
    'admin'
]);

$rawIds = trim((string) ($_GET['messageIds'] ?? ''));
$ids = [];

foreach (explode(',', $rawIds) as $rawId) {
    $id = (int) trim($rawId);

    if ($id > 0) {
        $ids[$id] = $id;
    }

    if (count($ids) >= 200) {
        break;
    }
}

$ids = array_values($ids);

if ($ids === []) {
    primewayResponderJson([
        'success' => true,
        'statuses' => new stdClass()
    ]);
}

try {
    $pdo = primewayPdo();
    $usuarioId = (int) $usuario['id'];

    $placeholders = implode(
        ',',
        array_fill(0, count($ids), '?')
    );

    $stmt = $pdo->prepare(
        "
            SELECT m.id
            FROM mensagens m
            INNER JOIN conversa_participantes cp
                ON cp.conversa_id = m.conversa_id
               AND cp.usuario_id = ?
               AND cp.ativo = 1
               AND cp.saiu_em IS NULL
            WHERE m.id IN ({$placeholders})
              AND m.remetente_usuario_id = ?
              AND m.excluida_em IS NULL
        "
    );

    $params = [$usuarioId];

    foreach ($ids as $id) {
        $params[] = $id;
    }

    $params[] = $usuarioId;
    $stmt->execute($params);

    $allowedIds = array_map(
        static fn (array $row): int => (int) $row['id'],
        $stmt->fetchAll()
    );

    $statuses = primewayChatStatusMensagens(
        $pdo,
        $allowedIds
    );

    primewayResponderJson([
        'success' => true,
        'statuses' => $statuses === []
            ? new stdClass()
            : $statuses
    ]);

} catch (Throwable $erro) {
    error_log(
        'PrimeWay Chat Status GET: ' . $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível consultar o status das mensagens.'
    ], 500);
}

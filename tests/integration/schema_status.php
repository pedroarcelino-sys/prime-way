<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

/* Smoke test somente leitura do controle de schema. */

require_once
    dirname(__DIR__, 2) .
    '/config/database.php';

$pdo = primewayPdo();

// Comparação somente leitura: nunca cria tabela nem aplica migrations.
$aplicadas = $pdo->query('SELECT versao, checksum FROM schema_migrations')->fetchAll(PDO::FETCH_KEY_PAIR);
$pendentes = [];
$divergentes = [];
$statusCalendario = $pdo->query("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eventos_calendario' AND COLUMN_NAME='status'")->fetchColumn();
$estruturaCalendarioValida = $statusCalendario === "enum('Agendado','Concluído','Cancelado')";
foreach (glob(dirname(__DIR__, 2) . '/database/migrations/*.sql') as $arquivo) {
    $versao = basename($arquivo);
    if (!array_key_exists($versao, $aplicadas)) {
        $pendentes[] = $versao;
    } elseif ($aplicadas[$versao] !== 'baseline' && !hash_equals($aplicadas[$versao], hash_file('sha256', $arquivo))) {
        $divergentes[] = $versao;
    }
}

$migrations =
    (int) $pdo
        ->query(
            'SELECT COUNT(1)
             FROM schema_migrations'
        )
        ->fetchColumn();

$estado =
    (int) $pdo
        ->query(
            'SELECT COUNT(1)
             FROM estado_aplicacao'
        )
        ->fetchColumn();

$migration010 =
    (int) $pdo
        ->query(
            "SELECT COUNT(1)
             FROM schema_migrations
             WHERE versao = '010_estado_aplicacao.sql'"
        )
        ->fetchColumn();

echo json_encode(
    [
        'registeredMigrations' => $migrations,
        'stateRows' => $estado,
        'migration010Applied' => $migration010 === 1,
        'pendingMigrations' => $pendentes,
        'checksumMismatches' => $divergentes,
        'calendarStatusValid' => $estruturaCalendarioValida,
        'ready' => $pendentes === [] && $divergentes === [] && $estruturaCalendarioValida
    ],
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES |
    JSON_THROW_ON_ERROR
);
exit($pendentes === [] && $divergentes === [] && $estruturaCalendarioValida ? 0 : 1);

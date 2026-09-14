<?php

declare(strict_types=1);

/* Smoke test somente leitura do controle de schema. */

require_once
    dirname(__DIR__, 2) .
    '/config/database.php';

$pdo = primewayPdo();

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
        'migration010Applied' => $migration010 === 1
    ],
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES |
    JSON_THROW_ON_ERROR
);

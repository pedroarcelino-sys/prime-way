<?php

declare(strict_types=1);

/*
    Smoke test local da consulta de Alunos.
    Não altera o banco e usa sessão somente em memória.
*/

final class PrimewaySessaoMemoria implements SessionHandlerInterface
{
    public function open(string $path, string $name): bool
    {
        return true;
    }

    public function close(): bool
    {
        return true;
    }

    public function read(string $id): string|false
    {
        return '';
    }

    public function write(string $id, string $data): bool
    {
        return true;
    }

    public function destroy(string $id): bool
    {
        return true;
    }

    public function gc(int $max_lifetime): int|false
    {
        return 0;
    }
}


$raiz = dirname(__DIR__, 2);

require_once
    $raiz .
    '/config/database.php';

require_once
    $raiz .
    '/config/session.php';

session_set_save_handler(
    new PrimewaySessaoMemoria(),
    true
);

primewayIniciarSessao();

$pdo = primewayPdo();
$usuarioId =
    (int) $pdo
        ->query(
            "SELECT id
             FROM usuarios
             WHERE perfil = 'admin'
               AND ativo = 1
             ORDER BY id
             LIMIT 1"
        )
        ->fetchColumn();

if ($usuarioId < 1) {
    throw new RuntimeException(
        'Nenhum administrador ativo foi encontrado.'
    );
}

$_SESSION['usuario_id'] = $usuarioId;
$_SESSION['usuario_nome'] = 'Smoke Test';
$_SESSION['usuario_email'] = 'smoke-test@local.invalid';
$_SESSION['usuario_perfil'] = 'admin';

$_SERVER['REQUEST_METHOD'] = 'GET';

require
    $raiz .
    '/api/alunos/index.php';

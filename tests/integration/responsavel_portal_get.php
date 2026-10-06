<?php

declare(strict_types=1);

// Smoke test somente leitura; sessão efêmera em memória, sem criar contas.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

final class PrimewayResponsavelPortalSessaoMemoria implements SessionHandlerInterface
{
    public function open(string $path, string $name): bool { return true; }
    public function close(): bool { return true; }
    public function read(string $id): string|false { return ''; }
    public function write(string $id, string $data): bool { return true; }
    public function destroy(string $id): bool { return true; }
    public function gc(int $max_lifetime): int|false { return 0; }
}

$raiz = dirname(__DIR__, 2);
require_once $raiz . '/config/database.php';
require_once $raiz . '/config/session.php';
session_set_save_handler(new PrimewayResponsavelPortalSessaoMemoria(), true);
primewayIniciarSessao();
$pdo = primewayPdo();
$usuarioId = (int) $pdo->query("SELECT u.id FROM usuarios u
    JOIN responsaveis r ON r.pessoa_id=u.pessoa_id
    JOIN pessoas p ON p.id=r.pessoa_id
    WHERE u.perfil='responsavel' AND u.ativo=1 AND r.status='ativo' AND p.ativo=1
    ORDER BY u.id LIMIT 1")->fetchColumn();
if ($usuarioId < 1) { throw new RuntimeException('Responsável ativo existente necessário para o teste.'); }
$_SESSION['usuario_id']=$usuarioId;
$_SESSION['usuario_nome']='Responsável Teste';
$_SESSION['usuario_email']='smoke-test@local.invalid';
$_SESSION['usuario_perfil']='responsavel';
$_SERVER['REQUEST_METHOD']='GET';
require $raiz . '/api/responsavel/index.php';

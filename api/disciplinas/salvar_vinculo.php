<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/_disciplinas.php';

primewayExigirMetodo('POST');
primewayExigirPerfis(['admin']);
primewayExigirCsrf();
$data = primewayLerJson();
try {
    $pdo = primewayPdo();
    $pdo->beginTransaction();
    $id = primewayDisciplinaSalvarVinculo($pdo, $data);
    $pdo->commit();
    primewayResponderJson(['success' => true, 'id' => $id]);
} catch (Throwable $error) {
    primewayDisciplinaResponderErro($error, $pdo ?? null);
}

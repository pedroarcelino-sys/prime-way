<?php
declare(strict_types=1);
require_once __DIR__.'/../_bootstrap.php';
// Tombstone: interfaces antigas não podem consultar nem sobrescrever estado_aplicacao.
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? ''));
if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    primewayResponderJson(['success'=>false, 'message'=>'Método não permitido.'], 405);
}
primewayExigirAutenticacao();
if ($method === 'POST') {
    primewayExigirCsrf();
    primewayResponderJson(['success'=>false, 'message'=>'Estado genérico aposentado. Utilize a API relacional do módulo.'], 422);
}
primewayResponderJson(['success'=>true, 'state'=>(object)[], 'writableKeys'=>[], 'retired'=>true, 'csrfToken'=>primewayTokenCsrf()]);
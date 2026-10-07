<?php
declare(strict_types=1);
require_once __DIR__.'/../_bootstrap.php';
primewayExigirMetodo('GET');
$user=primewayUsuarioAtualSessao();
primewayResponderJson([
    'authenticated'=>$user!==null,
    'usuario'=>$user,
    'csrfToken'=>primewayTokenCsrf()
]);
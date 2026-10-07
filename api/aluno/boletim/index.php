<?php
declare(strict_types=1);
require_once __DIR__.'/../../boletim/_boletim.php';
require_once __DIR__.'/../_contexto.php';
primewayExigirMetodo('GET');$user=primewayExigirPerfis(['aluno']);
try {
    $pdo=primewayPdo();$ctx=primewayAlunoContexto($pdo,$user);
    if (isset($_GET['studentId']) && primewayIdPositivo($_GET['studentId'])!==(int)$ctx['profile']['studentId'])
        primewayResponderJson(['success'=>false,'message'=>'Acesso não autorizado.'],403);
    $student=[...$ctx['profile'],'enrollment'=>$ctx['enrollment']];
    primewayBoletimResponder($pdo,[primewayBoletim($pdo,$student,$ctx['schoolYear']['year'] ?? null)]);
} catch (Throwable $error) {
    error_log('PrimeWay Boletim Aluno: '.$error->getMessage());
    primewayResponderJson(['success'=>false,'message'=>'Não foi possível emitir o boletim.'],500);
}

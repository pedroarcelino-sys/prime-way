<?php
declare(strict_types=1);
require_once __DIR__.'/../../boletim/_boletim.php';
require_once __DIR__.'/../_contexto.php';
primewayExigirMetodo('GET');$user=primewayExigirPerfis(['responsavel']);
try {
    $pdo=primewayPdo();$ctx=primewayResponsavelContexto($pdo,$user);$students=$ctx['students'];
    if (isset($_GET['studentId'])) {
        $id=primewayIdPositivo($_GET['studentId']);
        if ($id===null) primewayResponderJson(['success'=>false,'message'=>'Aluno inválido.'],422);
        $students=[primewayResponsavelExigirAluno($ctx,$id)];
    }
    $reports=array_map(static fn(array $s):array=>primewayBoletim($pdo,$s,$ctx['schoolYear']['year'] ?? null),$students);
    primewayBoletimResponder($pdo,$reports);
} catch (Throwable $error) {
    error_log('PrimeWay Boletim Responsável: '.$error->getMessage());
    primewayResponderJson(['success'=>false,'message'=>'Não foi possível emitir o boletim.'],500);
}

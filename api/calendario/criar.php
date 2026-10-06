<?php
declare(strict_types=1);
require_once __DIR__.'/_calendario.php';
primewayExigirMetodo('POST');
$user=primewayExigirPerfis(['admin']);
primewayExigirCsrf();
$data=primewayLerJson();
try {
    $pdo=primewayPdo();$pdo->beginTransaction();
    $event=primewayCalendarSave($pdo,$user,$data);
    $pdo->commit();primewayResponderJson(['success'=>true,'event'=>$event],201);
} catch(Throwable $error) { primewayCalendarErrorResponse($error,$pdo??null); }

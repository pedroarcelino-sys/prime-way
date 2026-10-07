<?php
declare(strict_types=1);
require_once __DIR__.'/../../notificacoes/_notificacoes.php';
primewayExigirMetodo('POST');$usuario=primewayExigirPerfis(['professor']);primewayExigirCsrf();$dados=primewayLerJson();
try {$pdo=primewayPdo();$pdo->beginTransaction();$updated=primewayNotificationReadAll($pdo,$usuario);$pdo->commit();primewayResponderJson(['success'=>true,'updated'=>$updated]);}
catch(Throwable $error){primewayNotificationErrorResponse($error,$pdo??null);}

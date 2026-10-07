<?php
declare(strict_types=1);
require_once __DIR__.'/_notificacoes.php';
primewayExigirMetodo('POST');$user=primewayExigirPerfis(['admin']);primewayExigirCsrf();
try {$pdo=primewayPdo();$pdo->beginTransaction();$count=primewayNotificationReadAll($pdo,$user);$pdo->commit();primewayResponderJson(['success'=>true,'updated'=>$count]);}
catch(Throwable $error){primewayNotificationErrorResponse($error,$pdo??null);}

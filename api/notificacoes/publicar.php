<?php
declare(strict_types=1);
require_once __DIR__.'/_notificacoes.php';
primewayExigirMetodo('POST');$user=primewayExigirPerfis(['admin']);primewayExigirCsrf();$data=primewayLerJson();
try {$pdo=primewayPdo();$pdo->beginTransaction();$id=primewayNotificationCreate($pdo,$user,$data);$pdo->commit();primewayResponderJson(['success'=>true,'notificationId'=>$id],201);}
catch(Throwable $error){primewayNotificationErrorResponse($error,$pdo??null);}

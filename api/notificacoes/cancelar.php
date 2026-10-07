<?php
declare(strict_types=1);
require_once __DIR__.'/_notificacoes.php';
primewayExigirMetodo('POST');$user=primewayExigirPerfis(['admin']);primewayExigirCsrf();$data=primewayLerJson();
try {$pdo=primewayPdo();$pdo->beginTransaction();primewayNotificationCancel($pdo,$user,primewayNotificationId($data['notificationId']??null));$pdo->commit();primewayResponderJson(['success'=>true]);}
catch(Throwable $error){primewayNotificationErrorResponse($error,$pdo??null);}

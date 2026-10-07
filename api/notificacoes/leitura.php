<?php
declare(strict_types=1);
require_once __DIR__.'/_notificacoes.php';
primewayExigirMetodo('POST');$user=primewayExigirPerfis(['admin']);primewayExigirCsrf();$data=primewayLerJson();
try {
    if(!is_bool($data['read']??null))primewayNotificationFail('Leitura inválida.');
    $pdo=primewayPdo();$pdo->beginTransaction();primewayNotificationRead($pdo,$user,primewayNotificationId($data['notificationId']??null),$data['read']);
    $pdo->commit();primewayResponderJson(['success'=>true]);
}catch(Throwable $error){primewayNotificationErrorResponse($error,$pdo??null);}

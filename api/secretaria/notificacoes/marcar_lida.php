<?php
declare(strict_types=1);
require_once __DIR__.'/../../notificacoes/_notificacoes.php';
primewayExigirMetodo('POST');$usuario=primewayExigirPerfis(['secretaria']);primewayExigirCsrf();$dados=primewayLerJson();
try {$pdo=primewayPdo();$pdo->beginTransaction();primewayNotificationRead($pdo,$usuario,primewayNotificationId($dados['notificationId']??null));$updated=1;$pdo->commit();primewayResponderJson(['success'=>true,'updated'=>$updated]);}
catch(Throwable $error){primewayNotificationErrorResponse($error,$pdo??null);}

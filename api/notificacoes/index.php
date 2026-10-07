<?php
declare(strict_types=1);
require_once __DIR__.'/_notificacoes.php';
primewayExigirMetodo('GET');$user=primewayExigirPerfis(['admin','professor']);
try {$pdo=primewayPdo();primewayResponderJson(['success'=>true,'notifications'=>primewayNotificationList($pdo,$user,$_GET),
    'unreadCount'=>primewayNotificationUnread($pdo,$user),'canManage'=>$user['perfil']==='admin','csrfToken'=>primewayTokenCsrf()]);}
catch(Throwable $error){primewayNotificationErrorResponse($error);}

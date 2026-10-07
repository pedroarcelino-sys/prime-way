<?php
declare(strict_types=1);
require_once __DIR__.'/../../notificacoes/_notificacoes.php';
primewayExigirMetodo('GET');$usuario=primewayExigirPerfis(['aluno']);
try {$pdo=primewayPdo();primewayResponderJson(['success'=>true,'notifications'=>primewayNotificationList($pdo,$usuario,$_GET),'unreadCount'=>primewayNotificationUnread($pdo,$usuario)]);}
catch(Throwable $error){primewayNotificationErrorResponse($error);}

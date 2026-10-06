<?php
declare(strict_types=1);
require_once __DIR__.'/_calendario.php';
primewayExigirMetodo('GET');
$user=primewayExigirPerfis(['admin','professor']);
try { primewayResponderJson(primewayCalendarList(primewayPdo(),$user,$_GET)); }
catch(Throwable $error) { primewayCalendarErrorResponse($error); }

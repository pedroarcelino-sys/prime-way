<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/_disciplinas.php';

primewayExigirMetodo('GET');
primewayExigirPerfis(['admin']);
try {
    primewayResponderJson(['success' => true, 'subjects' => primewayDisciplinasListar(primewayPdo())]);
} catch (Throwable $error) {
    primewayDisciplinaResponderErro($error);
}

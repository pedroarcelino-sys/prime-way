<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';

primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'responsavel'
    ]);

try {

    $pdo =
        primewayPdo();

    $contexto =
        primewayResponsavelContexto(
            $pdo,
            $usuario
        );

    primewayResponderJson([
        'success' => true,
        'profile' =>
            $contexto['profile'],
        'schoolYear' =>
            $contexto['schoolYear'],
        'students' =>
            $contexto['students']
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Responsável Dados GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar os dados do responsável.'
        ],
        500
    );
}

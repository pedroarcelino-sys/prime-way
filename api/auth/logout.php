<?php

declare(strict_types=1);

/*====================================================
        LOGOUT API - PRIMEWAY SCHOOL
====================================================*/

require_once
    __DIR__ .
    '/../../config/session.php';


header(
    'Content-Type: application/json; charset=UTF-8'
);

header(
    'Cache-Control: no-store, no-cache, must-revalidate, max-age=0'
);

header(
    'Pragma: no-cache'
);


/*====================================================
                    MÉTODO
====================================================*/

if (
    ($_SERVER['REQUEST_METHOD'] ?? '') !==
    'POST'
) {
    header(
        'Allow: POST'
    );


    http_response_code(
        405
    );


    echo json_encode(
        [
            'success' =>
                false,

            'message' =>
                'Método não permitido.'
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );


    exit;
}


/*====================================================
                    ENCERRAR SESSÃO
====================================================*/

primewayIniciarSessao();


if (
    !primewayCsrfValido()
) {
    http_response_code(403);

    echo json_encode(
        [
            'success' => false,
            'message' => 'Token de segurança inválido ou expirado.'
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

    exit;
}


$_SESSION =
    [];


if (
    ini_get(
        'session.use_cookies'
    )
) {
    $params =
        session_get_cookie_params();


    setcookie(
        session_name(),
        '',
        [
            'expires' =>
                time() - 42000,

            'path' =>
                $params['path'] ??
                '/',

            'domain' =>
                $params['domain'] ??
                '',

            'secure' =>
                (bool) (
                    $params['secure'] ??
                    false
                ),

            'httponly' =>
                (bool) (
                    $params['httponly'] ??
                    true
                ),

            'samesite' =>
                'Lax'
        ]
    );
}


session_destroy();


echo json_encode(
    [
        'success' =>
            true
    ],
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
);

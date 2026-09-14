<?php

declare(strict_types=1);

/*====================================================
        SESSÃO API - PRIMEWAY SCHOOL
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
    'GET'
) {

    header(
        'Allow: GET'
    );


    http_response_code(
        405
    );


    echo json_encode(
        [
            'authenticated' =>
                false,

            'usuario' =>
                null,

            'message' =>
                'Método não permitido.'
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );


    exit;
}


/*====================================================
                    SESSÃO
====================================================*/

primewayIniciarSessao();


$autenticado =
    isset(
        $_SESSION['usuario_id'],
        $_SESSION['usuario_email'],
        $_SESSION['usuario_perfil']
    );


if (
    !$autenticado
) {

    echo json_encode(
        [
            'authenticated' =>
                false,

            'usuario' =>
                null
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );


    exit;
}


$perfil =
    (string) $_SESSION[
        'usuario_perfil'
    ];


/*
    Enquanto a migração para o backend ainda está
    em andamento, somente esses perfis possuem área
    funcional liberada.
*/

if (
    !in_array(
        $perfil,
        [
            'admin',
            'professor',
            'responsavel',
            'aluno'
        ],
        true
    )
) {

    $_SESSION =
        [];


    session_destroy();


    echo json_encode(
        [
            'authenticated' =>
                false,

            'usuario' =>
                null
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );


    exit;
}


echo json_encode(
    [
        'authenticated' =>
            true,

        'usuario' => [
            'id' =>
                (int) $_SESSION[
                    'usuario_id'
                ],

            'nome' =>
                (string) (
                    $_SESSION[
                        'usuario_nome'
                    ] ??
                    $_SESSION[
                        'usuario_email'
                    ]
                ),

            'email' =>
                (string) $_SESSION[
                    'usuario_email'
                ],

            'perfil' =>
                $perfil
        ],

        'csrfToken' =>
            primewayTokenCsrf()
    ],
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
);

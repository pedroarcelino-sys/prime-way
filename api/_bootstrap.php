<?php

declare(strict_types=1);

/*====================================================
        BASE DAS APIs - PRIMEWAY SCHOOL
====================================================*/

require_once
    __DIR__ .
    '/../config/database.php';

require_once
    __DIR__ .
    '/../config/session.php';


/*====================================================
                    CABEÇALHOS
====================================================*/

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
                RESPOSTA JSON
====================================================*/

function primewayResponderJson(
    array $dados,
    int $status = 200
): never {

    http_response_code(
        $status
    );


    echo json_encode(
        $dados,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );


    exit;
}


/*====================================================
                VALIDAR MÉTODO HTTP
====================================================*/

function primewayExigirMetodo(
    string $metodoPermitido
): void {

    $metodoAtual =
        strtoupper(
            (string) (
                $_SERVER[
                    'REQUEST_METHOD'
                ] ??
                ''
            )
        );


    $metodoPermitido =
        strtoupper(
            $metodoPermitido
        );


    if (
        $metodoAtual ===
        $metodoPermitido
    ) {
        return;
    }


    header(
        'Allow: ' .
        $metodoPermitido
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Método não permitido.'
        ],
        405
    );
}


/*====================================================
                USUÁRIO DA SESSÃO
====================================================*/

function primewayUsuarioSessao(): ?array
{
    primewayIniciarSessao();


    if (
        !isset(
            $_SESSION[
                'usuario_id'
            ],
            $_SESSION[
                'usuario_email'
            ],
            $_SESSION[
                'usuario_perfil'
            ]
        )
    ) {
        return null;
    }


    return [
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
            (string) $_SESSION[
                'usuario_perfil'
            ]
    ];
}


/*====================================================
                EXIGIR AUTENTICAÇÃO
====================================================*/

function primewayExigirAutenticacao(): array
{
    $usuario =
        primewayUsuarioSessao();


    if (
        $usuario ===
        null
    ) {

        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'Autenticação necessária.'
            ],
            401
        );
    }


    return $usuario;
}


/*====================================================
                EXIGIR PERFIL
====================================================*/

function primewayExigirPerfis(
    array $perfisPermitidos
): array {

    $usuario =
        primewayExigirAutenticacao();


    if (
        !in_array(
            $usuario[
                'perfil'
            ],
            $perfisPermitidos,
            true
        )
    ) {

        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'Você não possui permissão para esta operação.'
            ],
            403
        );
    }


    return $usuario;
}


/*====================================================
                    EXIGIR CSRF
====================================================*/

function primewayExigirCsrf(): void
{
    if (
        primewayCsrfValido()
    ) {
        return;
    }

    primewayResponderJson(
        [
            'success' => false,
            'message' => 'Token de segurança inválido ou expirado.'
        ],
        403
    );
}


/*====================================================
                    LER JSON
====================================================*/

function primewayLerJson(): array
{
    $conteudo =
        file_get_contents(
            'php://input'
        );


    if (
        $conteudo ===
        false ||
        trim(
            $conteudo
        ) ===
        ''
    ) {

        return [];
    }


    try {

        $dados =
            json_decode(
                $conteudo,
                true,
                512,
                JSON_THROW_ON_ERROR
            );

    } catch (
        JsonException
    ) {

        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'JSON inválido.'
            ],
            400
        );
    }


    if (
        !is_array(
            $dados
        )
    ) {

        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'O corpo da requisição deve ser um objeto JSON.'
            ],
            400
        );
    }


    return $dados;
}


/*====================================================
                ID INTEIRO POSITIVO
====================================================*/

function primewayIdPositivo(
    mixed $valor
): ?int {

    if (
        is_int(
            $valor
        )
    ) {

        return $valor > 0
            ? $valor
            : null;
    }


    if (
        !is_string(
            $valor
        ) &&
        !is_numeric(
            $valor
        )
    ) {

        return null;
    }


    $valorString =
        trim(
            (string) $valor
        );


    if (
        $valorString ===
        '' ||
        !ctype_digit(
            $valorString
        )
    ) {

        return null;
    }


    $id =
        (int) $valorString;


    return $id > 0
        ? $id
        : null;
}

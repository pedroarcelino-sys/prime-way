<?php

declare(strict_types=1);

/*====================================================
            LOGIN API - PRIMEWAY SCHOOL
====================================================*/

require_once
    __DIR__ .
    '/../../config/database.php';

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
                    RESPOSTA
====================================================*/

function responderLogin(
    int $status,
    array $payload
): never {

    http_response_code(
        $status
    );


    echo json_encode(
        $payload,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );


    exit;
}


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


    responderLogin(
        405,
        [
            'success' =>
                false,

            'message' =>
                'Método não permitido.'
        ]
    );

}


/*====================================================
                    ENTRADA
====================================================*/

$contentType =
    strtolower(
        trim(
            explode(
                ';',
                $_SERVER['CONTENT_TYPE'] ??
                ''
            )[0]
        )
    );


if (
    $contentType !==
    'application/json'
) {

    responderLogin(
        415,
        [
            'success' =>
                false,

            'message' =>
                'Envie os dados em JSON.'
        ]
    );

}


$rawBody =
    file_get_contents(
        'php://input'
    );


try {

    $input =
        json_decode(
            $rawBody !== false
                ? $rawBody
                : '',
            true,
            16,
            JSON_THROW_ON_ERROR
        );

} catch (
    JsonException
) {

    responderLogin(
        400,
        [
            'success' =>
                false,

            'message' =>
                'JSON inválido.'
        ]
    );

}


if (
    !is_array(
        $input
    )
) {

    responderLogin(
        400,
        [
            'success' =>
                false,

            'message' =>
                'Dados de login inválidos.'
        ]
    );

}


/*====================================================
                    CREDENCIAIS
====================================================*/

$email =
    strtolower(
        trim(
            (string) (
                $input['email'] ??
                ''
            )
        )
    );


$senha =
    (string) (
        $input['senha'] ??
        ''
    );


if (
    !filter_var(
        $email,
        FILTER_VALIDATE_EMAIL
    ) ||
    $senha ===
        ''
) {

    responderLogin(
        400,
        [
            'success' =>
                false,

            'message' =>
                'Informe e-mail e senha válidos.'
        ]
    );

}


/*====================================================
                TAMANHO DOS DADOS
====================================================*/

if (
    strlen(
        $email
    ) > 190 ||
    strlen(
        $senha
    ) > 4096
) {

    responderLogin(
        400,
        [
            'success' =>
                false,

            'message' =>
                'Dados de login inválidos.'
        ]
    );

}


/*====================================================
                    AUTENTICAÇÃO
====================================================*/

primewayIniciarSessao();

$limiteLogin =
    primewayStatusLimiteLogin();

if (
    $limiteLogin['bloqueado']
) {
    header(
        'Retry-After: ' .
        $limiteLogin['tentar_novamente_em']
    );

    responderLogin(
        429,
        [
            'success' => false,
            'message' => 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
        ]
    );
}

try {

    $pdo =
        primewayPdo();


    $stmt =
        $pdo->prepare(
            'SELECT
                id,
                nome,
                email,
                senha_hash,
                perfil,
                ativo
             FROM usuarios
             WHERE email = :email
             LIMIT 1'
        );


    $stmt->execute([
        ':email' =>
            $email
    ]);


    $usuario =
        $stmt->fetch();


    /*
        Hash auxiliar usado quando o e-mail
        não existe para evitar diferenças
        desnecessárias no tempo da resposta.
    */

    $hashParaVerificar =
        is_array(
            $usuario
        )
            ? (string) $usuario[
                'senha_hash'
            ]
            : '$2y$12$1Rm53XA/pQpscF.ETwgNU.ssIb0jX0OYR5OuQSfe2XygQ0rS/jVNq';


    $senhaValida =
        password_verify(
            $senha,
            $hashParaVerificar
        );


    $usuarioValido =
        is_array(
            $usuario
        ) &&
        (int) $usuario[
            'ativo'
        ] ===
            1 &&
        $senhaValida;


    if (
        !$usuarioValido
    ) {

        $limiteLogin =
            primewayRegistrarFalhaLogin();

        if (
            $limiteLogin['bloqueado']
        ) {
            header(
                'Retry-After: ' .
                $limiteLogin['tentar_novamente_em']
            );
        }

        responderLogin(
            $limiteLogin['bloqueado']
                ? 429
                : 401,
            [
                'success' =>
                    false,

                'message' =>
                    $limiteLogin['bloqueado']
                        ? 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
                        : 'E-mail ou senha incorretos.'
            ]
        );

    }


    $perfil =
        (string) $usuario[
            'perfil'
        ];


    primewayLimparFalhasLogin();


    /*================================================
                    PERFIL LIBERADO
    ================================================*/

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

        responderLogin(
            403,
            [
                'success' =>
                    false,

                'message' =>
                    'Este perfil ainda não possui uma área disponível.'
            ]
        );

    }


    /*================================================
                    REHASH DA SENHA
    ================================================*/

    if (
        password_needs_rehash(
            (string) $usuario[
                'senha_hash'
            ],
            PASSWORD_DEFAULT
        )
    ) {

        $novoHash =
            password_hash(
                $senha,
                PASSWORD_DEFAULT
            );


        $rehash =
            $pdo->prepare(
                'UPDATE usuarios
                 SET senha_hash = :senha_hash
                 WHERE id = :id'
            );


        $rehash->execute([
            ':senha_hash' =>
                $novoHash,

            ':id' =>
                (int) $usuario[
                    'id'
                ]
        ]);

    }


    /*================================================
                    CRIAR SESSÃO
    ================================================*/

    primewayIniciarSessao();


    session_regenerate_id(
        true
    );


    $_SESSION[
        'usuario_id'
    ] =
        (int) $usuario[
            'id'
        ];


    $_SESSION[
        'usuario_nome'
    ] =
        $usuario['nome'] !== null &&
        trim(
            (string) $usuario[
                'nome'
            ]
        ) !==
        ''
            ? trim(
                (string) $usuario[
                    'nome'
                ]
            )
            : (string) $usuario[
                'email'
            ];


    $_SESSION[
        'usuario_email'
    ] =
        (string) $usuario[
            'email'
        ];


    $_SESSION[
        'usuario_perfil'
    ] =
        $perfil;


    $_SESSION[
        'autenticado_em'
    ] =
        time();


    /*================================================
                    ÚLTIMO LOGIN
    ================================================*/

    $updateLogin =
        $pdo->prepare(
            'UPDATE usuarios
             SET ultimo_login = NOW()
             WHERE id = :id'
        );


    $updateLogin->execute([
        ':id' =>
            (int) $usuario[
                'id'
            ]
    ]);


    /*================================================
                    SUCESSO
    ================================================*/

    responderLogin(
        200,
        [
            'success' =>
                true,

            'usuario' => [
                'id' =>
                    (int) $usuario[
                        'id'
                    ],

                'nome' =>
                    $_SESSION[
                        'usuario_nome'
                    ],

                'email' =>
                    (string) $usuario[
                        'email'
                    ],

                'perfil' =>
                    $perfil
            ],

            'csrfToken' =>
                primewayTokenCsrf()
        ]
    );

} catch (
    Throwable $erro
) {

    error_log(
        'PrimeWay login: ' .
        $erro->getMessage()
    );


    responderLogin(
        500,
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível concluir o login.'
        ]
    );

}

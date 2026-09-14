<?php

declare(strict_types=1);

/*====================================================
            SESSÃO - PRIMEWAY SCHOOL
====================================================*/


function primewayIniciarSessao(): void
{
    if (
        session_status() ===
        PHP_SESSION_ACTIVE
    ) {
        return;
    }


    ini_set(
        'session.use_strict_mode',
        '1'
    );

    ini_set(
        'session.use_only_cookies',
        '1'
    );

    ini_set(
        'session.cookie_httponly',
        '1'
    );


    $secure =
        !empty(
            $_SERVER['HTTPS']
        ) &&
        $_SERVER['HTTPS'] !==
        'off';


    session_name(
        'primeway_session'
    );


    session_set_cookie_params([
        'lifetime' =>
            0,

        'path' =>
            '/',

        'domain' =>
            '',

        'secure' =>
            $secure,

        'httponly' =>
            true,

        'samesite' =>
            'Lax'
    ]);


    session_start();
}


/*====================================================
                PROTEÇÃO CSRF
====================================================*/

function primewayTokenCsrf(): string
{
    primewayIniciarSessao();

    $token =
        $_SESSION['csrf_token'] ??
        null;

    if (
        !is_string($token) ||
        strlen($token) !== 64
    ) {
        $token =
            bin2hex(
                random_bytes(32)
            );

        $_SESSION['csrf_token'] =
            $token;
    }

    return $token;
}


function primewayCsrfValido(): bool
{
    primewayIniciarSessao();

    $recebido =
        $_SERVER['HTTP_X_CSRF_TOKEN'] ??
        '';

    $esperado =
        $_SESSION['csrf_token'] ??
        '';

    return
        is_string($recebido) &&
        is_string($esperado) &&
        $recebido !== '' &&
        $esperado !== '' &&
        hash_equals(
            $esperado,
            $recebido
        );
}


/*====================================================
        LIMITAÇÃO DE TENTATIVAS DE LOGIN
====================================================*/

function primewayStatusLimiteLogin(): array
{
    primewayIniciarSessao();

    $agora = time();
    $janela = 15 * 60;
    $maximo = 5;
    $estado =
        $_SESSION['limite_login'] ??
        [];

    if (
        !is_array($estado) ||
        !isset($estado['inicio'], $estado['tentativas']) ||
        !is_int($estado['inicio']) ||
        !is_int($estado['tentativas']) ||
        ($agora - $estado['inicio']) >= $janela
    ) {
        $estado = [
            'inicio' => $agora,
            'tentativas' => 0
        ];

        $_SESSION['limite_login'] =
            $estado;
    }

    $bloqueado =
        $estado['tentativas'] >=
        $maximo;

    return [
        'bloqueado' => $bloqueado,
        'restante' => max(
            0,
            $maximo - $estado['tentativas']
        ),
        'tentar_novamente_em' => $bloqueado
            ? max(
                1,
                $janela - ($agora - $estado['inicio'])
            )
            : 0
    ];
}


function primewayRegistrarFalhaLogin(): array
{
    primewayStatusLimiteLogin();
    $_SESSION['limite_login']['tentativas']++;

    return primewayStatusLimiteLogin();
}


function primewayLimparFalhasLogin(): void
{
    primewayIniciarSessao();
    unset($_SESSION['limite_login']);
}

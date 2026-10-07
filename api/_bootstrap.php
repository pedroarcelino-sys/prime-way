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
        primewayUsuarioAtualSessao();


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

function primewayUsuarioAtualSessao(): ?array
{
    $usuario = primewayUsuarioSessao();
    if (!$usuario) return null;
    // A sessão identifica a conta; atividade e perfil atuais pertencem ao banco.
    try {
    $stmt = primewayPdo()->prepare(
        'SELECT u.id,u.email,u.perfil,u.ativo,pe.ativo AS pessoa_ativa,
                COALESCE(pe.nome,u.nome,u.email) AS nome
         FROM usuarios u LEFT JOIN pessoas pe ON pe.id=u.pessoa_id WHERE u.id=? LIMIT 1'
    );
    $stmt->execute([$usuario['id']]);
    $atual = $stmt->fetch();
    if (!$atual || (int)$atual['ativo'] !== 1
        || !in_array($atual['perfil'], ['admin','secretaria','professor','aluno','responsavel'], true)
        || ($atual['pessoa_ativa'] !== null && (int)$atual['pessoa_ativa'] !== 1)) {
        unset($_SESSION['usuario_id'], $_SESSION['usuario_email'], $_SESSION['usuario_perfil'], $_SESSION['usuario_nome']);
        return null;
    }
    $usuario = ['id'=>(int)$atual['id'],'nome'=>$atual['nome'],'email'=>$atual['email'],'perfil'=>$atual['perfil']];
    $_SESSION['usuario_perfil'] = $usuario['perfil'];
    $_SESSION['usuario_email'] = $usuario['email'];
    $_SESSION['usuario_nome'] = $usuario['nome'];
    return $usuario;
    } catch (Throwable $error) {
        error_log('PrimeWay sessão: '.$error->getMessage());
        primewayResponderJson(['success'=>false,'message'=>'Não foi possível validar a sessão.'],500);
    }
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

<?php

declare(strict_types=1);

/*====================================================
        ESTADO COMPARTILHADO - PRIMEWAY SCHOOL
        GET/POST /api/estado/index.php
====================================================*/

require_once
    __DIR__ .
    '/../_bootstrap.php';


$metodo =
    strtoupper(
        (string) (
            $_SERVER['REQUEST_METHOD'] ??
            ''
        )
    );

if (
    !in_array(
        $metodo,
        ['GET', 'POST'],
        true
    )
) {
    header('Allow: GET, POST');

    primewayResponderJson(
        [
            'success' => false,
            'message' => 'Método não permitido.'
        ],
        405
    );
}


$usuario =
    primewayExigirPerfis([
        'admin',
        'professor'
    ]);


$chavesPorPerfil = [
    'admin' => [
        'primewayGuardians',
        'primewaySubjects',
        'primewayClasses',
        'primewayCalendarEvents',
        'primewayNotifications',
        'primewayChatProfessor'
    ],
    'professor' => [
        'primewayClasses',
        'primewayCalendarEvents',
        'primewayNotifications',
        'primewayChatProfessor'
    ]
];

$chavesPermitidas =
    $chavesPorPerfil[
        $usuario['perfil']
    ] ??
    [];

$chavesGravaveisPorPerfil = [
    'admin' => $chavesPorPerfil['admin'],
    'professor' => [
        'primewayCalendarEvents',
        'primewayNotifications',
        'primewayChatProfessor'
    ]
];

$chavesGravaveis =
    $chavesGravaveisPorPerfil[
        $usuario['perfil']
    ] ??
    [];

$escopoUsuario =
    'usuario:' .
    $usuario['id'];


try {
    $pdo = primewayPdo();

    if (
        $metodo === 'GET'
    ) {
        $marcadores =
            implode(
                ', ',
                array_fill(
                    0,
                    count($chavesPermitidas),
                    '?'
                )
            );

        $stmt =
            $pdo->prepare(
                "SELECT
                    chave,
                    valor_json
                 FROM estado_aplicacao
                 WHERE chave IN ($marcadores)
                   AND (
                        escopo = 'global'
                        OR escopo = ?
                   )
                 ORDER BY
                    CASE WHEN escopo = 'global' THEN 0 ELSE 1 END"
            );

        $stmt->execute([
            ...$chavesPermitidas,
            $escopoUsuario
        ]);

        $estado = [];

        foreach (
            $stmt->fetchAll() as $linha
        ) {
            $estado[
                (string) $linha['chave']
            ] = json_decode(
                (string) $linha['valor_json'],
                true,
                512,
                JSON_THROW_ON_ERROR
            );
        }

        primewayResponderJson([
            'success' => true,
            'state' => $estado,
            'writableKeys' => $chavesGravaveis,
            'csrfToken' => primewayTokenCsrf()
        ]);
    }


    primewayExigirCsrf();

    $dados =
        primewayLerJson();

    $chave =
        is_string($dados['key'] ?? null)
            ? trim($dados['key'])
            : '';

    if (
        !in_array(
            $chave,
            $chavesGravaveis,
            true
        ) ||
        !array_key_exists('value', $dados)
    ) {
        primewayResponderJson(
            [
                'success' => false,
                'message' => 'Chave de estado inválida.'
            ],
            422
        );
    }

    $valorJson =
        json_encode(
            $dados['value'],
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES |
            JSON_THROW_ON_ERROR
        );

    if (
        strlen($valorJson) >
        2 * 1024 * 1024
    ) {
        primewayResponderJson(
            [
                'success' => false,
                'message' => 'O estado excede o limite de 2 MB.'
            ],
            413
        );
    }

    $pessoal =
        $chave ===
        'primewayChatProfessor';

    $escopo =
        $pessoal
            ? $escopoUsuario
            : 'global';

    $usuarioId =
        $pessoal
            ? $usuario['id']
            : null;

    $stmt =
        $pdo->prepare(
            'INSERT INTO estado_aplicacao (
                chave,
                escopo,
                usuario_id,
                valor_json,
                atualizado_por_usuario_id
             ) VALUES (
                :chave,
                :escopo,
                :usuario_id,
                :valor_json,
                :atualizado_por
             )
             ON DUPLICATE KEY UPDATE
                usuario_id = VALUES(usuario_id),
                valor_json = VALUES(valor_json),
                atualizado_por_usuario_id = VALUES(atualizado_por_usuario_id),
                atualizado_em = CURRENT_TIMESTAMP'
        );

    $stmt->execute([
        ':chave' => $chave,
        ':escopo' => $escopo,
        ':usuario_id' => $usuarioId,
        ':valor_json' => $valorJson,
        ':atualizado_por' => $usuario['id']
    ]);

    primewayResponderJson([
        'success' => true,
        'key' => $chave,
        'updatedAt' => date(DATE_ATOM),
        'csrfToken' => primewayTokenCsrf()
    ]);

} catch (
    Throwable $erro
) {
    error_log(
        'PrimeWay estado: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' => 'Não foi possível sincronizar os dados.'
        ],
        500
    );
}

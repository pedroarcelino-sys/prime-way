<?php

declare(strict_types=1);

/*====================================================
        CONFIGURAÇÕES API - PRIMEWAY SCHOOL
        GET /api/configuracoes/index.php
====================================================*/

require_once
    __DIR__ .
    '/../_bootstrap.php';


/*====================================================
                    REQUISIÇÃO
====================================================*/

primewayExigirMetodo(
    'GET'
);


/*
    Configurações estruturais são administradas
    somente pelo perfil Admin nesta etapa.
*/
primewayExigirPerfis([
    'admin'
]);


/*====================================================
        CONVERTER VALOR ARMAZENADO NO BANCO
====================================================*/

function primewayConverterConfiguracao(
    ?string $valor,
    string $tipo
): mixed {

    if (
        $valor ===
        null
    ) {
        return null;
    }


    return match (
        $tipo
    ) {

        'inteiro' =>
            (int) $valor,

        'decimal' =>
            (float) $valor,

        'booleano' =>
            in_array(
                strtolower(
                    trim(
                        $valor
                    )
                ),
                [
                    '1',
                    'true'
                ],
                true
            ),

        'json' =>
            json_decode(
                $valor,
                true
            ),

        default =>
            $valor
    };
}


/*====================================================
                CARREGAR CONFIGURAÇÕES
====================================================*/

try {

    $pdo =
        primewayPdo();


    $stmt =
        $pdo->query(
            '
                SELECT
                    grupo,
                    chave,
                    valor,
                    tipo
                FROM configuracoes_sistema
                ORDER BY
                    grupo,
                    chave
            '
        );


    $configuracoes =
        [];


    while (
        $linha =
            $stmt->fetch()
    ) {

        $grupo =
            (string) $linha[
                'grupo'
            ];

        $chave =
            (string) $linha[
                'chave'
            ];

        $tipo =
            (string) $linha[
                'tipo'
            ];

        $valor =
            $linha[
                'valor'
            ];


        if (
            !isset(
                $configuracoes[
                    $grupo
                ]
            )
        ) {

            $configuracoes[
                $grupo
            ] =
                [];
        }


        $configuracoes[
            $grupo
        ][
            $chave
        ] =
            primewayConverterConfiguracao(
                $valor !== null
                    ? (string) $valor
                    : null,
                $tipo
            );
    }


    /*================================================
                    ANO LETIVO ATIVO
    ================================================*/

    $stmtAno =
        $pdo->query(
            '
                SELECT
                    ano
                FROM anos_letivos
                WHERE ativo = 1
                ORDER BY ano DESC
                LIMIT 1
            '
        );


    $anoLetivo =
        $stmtAno->fetchColumn();


    $anoLetivo =
        $anoLetivo !==
        false
            ? (int) $anoLetivo
            : null;


    /*================================================
                PÁGINA PADRÃO

        O banco utiliza o identificador da página.
        O front atual utiliza o nome do arquivo HTML.
    ================================================*/

    $paginaBanco =
        (string) (
            $configuracoes[
                'sistema'
            ][
                'pagina_padrao'
            ] ??
            'dashboard'
        );


    $paginaPadrao =
        match (
            $paginaBanco
        ) {

            'dashboard',
            'dashboard.html' =>
                'dashboard.html',

            'calendario',
            'calendario.html' =>
                'calendario.html',

            'notificacoes',
            'notificacoes.html' =>
                'notificacoes.html',

            default =>
                'dashboard.html'
        };


    /*================================================
            FORMATO UTILIZADO PELO FRONT-END
    ================================================*/

    $settings = [

        'school' => [

            'name' =>
                (string) (
                    $configuracoes[
                        'escola'
                    ][
                        'nome'
                    ] ??
                    ''
                ),

            'legalName' =>
                (string) (
                    $configuracoes[
                        'escola'
                    ][
                        'razao_social'
                    ] ??
                    ''
                ),

            'document' =>
                (string) (
                    $configuracoes[
                        'escola'
                    ][
                        'documento'
                    ] ??
                    ''
                ),

            'director' =>
                (string) (
                    $configuracoes[
                        'escola'
                    ][
                        'diretor'
                    ] ??
                    ''
                ),

            'email' =>
                (string) (
                    $configuracoes[
                        'escola'
                    ][
                        'email'
                    ] ??
                    ''
                ),

            'phone' =>
                (string) (
                    $configuracoes[
                        'escola'
                    ][
                        'telefone'
                    ] ??
                    ''
                ),

            'address' =>
                (string) (
                    $configuracoes[
                        'escola'
                    ][
                        'endereco'
                    ] ??
                    ''
                ),

            'city' =>
                (string) (
                    $configuracoes[
                        'escola'
                    ][
                        'cidade'
                    ] ??
                    ''
                ),

            'state' =>
                (string) (
                    $configuracoes[
                        'escola'
                    ][
                        'estado'
                    ] ??
                    ''
                ),

            'zip' =>
                (string) (
                    $configuracoes[
                        'escola'
                    ][
                        'cep'
                    ] ??
                    ''
                )
        ],


        'academic' => [

            /*
                O ano NÃO vem de configuracoes_sistema.

                anos_letivos continua sendo a fonte
                oficial dessa informação.
            */
            'year' =>
                $anoLetivo,

            'period' =>
                (string) (
                    $configuracoes[
                        'academico'
                    ][
                        'modelo_periodos_padrao'
                    ] ??
                    'Bimestral'
                ),

            'passingAverage' =>
                (float) (
                    $configuracoes[
                        'academico'
                    ][
                        'media_aprovacao'
                    ] ??
                    6
                ),

            'minAttendance' =>
                (float) (
                    $configuracoes[
                        'academico'
                    ][
                        'frequencia_minima'
                    ] ??
                    75
                ),

            'classDuration' =>
                (int) (
                    $configuracoes[
                        'academico'
                    ][
                        'duracao_aula_minutos'
                    ] ??
                    50
                ),

            'schoolDays' =>
                (int) (
                    $configuracoes[
                        'academico'
                    ][
                        'dias_letivos'
                    ] ??
                    200
                ),

            'defaultShift' =>
                (string) (
                    $configuracoes[
                        'academico'
                    ][
                        'turno_padrao'
                    ] ??
                    'Manhã'
                )
        ],


        'notifications' => [

            'calendar' =>
                (bool) (
                    $configuracoes[
                        'notificacoes'
                    ][
                        'calendario'
                    ] ??
                    true
                ),

            'announcements' =>
                (bool) (
                    $configuracoes[
                        'notificacoes'
                    ][
                        'comunicados'
                    ] ??
                    true
                ),

            'grades' =>
                (bool) (
                    $configuracoes[
                        'notificacoes'
                    ][
                        'notas'
                    ] ??
                    true
                ),

            'attendance' =>
                (bool) (
                    $configuracoes[
                        'notificacoes'
                    ][
                        'frequencia'
                    ] ??
                    true
                ),

            'guardians' =>
                (bool) (
                    $configuracoes[
                        'notificacoes'
                    ][
                        'responsaveis'
                    ] ??
                    true
                )
        ],


        'system' => [

            'dateFormat' =>
                (string) (
                    $configuracoes[
                        'sistema'
                    ][
                        'formato_data'
                    ] ??
                    'DD/MM/YYYY'
                ),

            'defaultPage' =>
                $paginaPadrao,

            'timezone' =>
                (string) (
                    $configuracoes[
                        'sistema'
                    ][
                        'fuso_horario'
                    ] ??
                    'America/Sao_Paulo'
                )
        ]
    ];


    /*================================================
                    RESPOSTA
    ================================================*/

    primewayResponderJson(
        [
            'success' =>
                true,

            'settings' =>
                $settings
        ]
    );

} catch (
    Throwable $erro
) {

    /*
        O detalhe técnico fica apenas no log do PHP.
        Não enviamos estrutura interna do servidor
        para o navegador.
    */
    error_log(
        'PrimeWay Configurações GET: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível carregar as configurações.'
        ],
        500
    );
}
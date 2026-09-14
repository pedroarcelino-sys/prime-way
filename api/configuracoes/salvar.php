<?php

declare(strict_types=1);

/*====================================================
        SALVAR CONFIGURAÇÕES - PRIMEWAY SCHOOL
        POST /api/configuracoes/salvar.php
====================================================*/

require_once
    __DIR__ .
    '/../_bootstrap.php';


/*====================================================
                    REQUISIÇÃO
====================================================*/

primewayExigirMetodo(
    'POST'
);

$usuario =
    primewayExigirPerfis([
        'admin'
    ]);

primewayExigirCsrf();

$dados =
    primewayLerJson();


/*====================================================
                FUNÇÕES AUXILIARES
====================================================*/

function primewayObjeto(
    mixed $valor
): array {

    return is_array(
        $valor
    )
        ? $valor
        : [];
}


function primewayTexto(
    mixed $valor
): string {

    if (
        !is_string(
            $valor
        )
    ) {
        return '';
    }


    return trim(
        $valor
    );
}


function primewayNumero(
    mixed $valor
): ?float {

    if (
        !is_int(
            $valor
        ) &&
        !is_float(
            $valor
        ) &&
        !is_string(
            $valor
        )
    ) {
        return null;
    }


    if (
        !is_numeric(
            $valor
        )
    ) {
        return null;
    }


    return (float) $valor;
}


function primewayBooleano(
    mixed $valor
): ?bool {

    if (
        is_bool(
            $valor
        )
    ) {
        return $valor;
    }


    if (
        $valor === 1 ||
        $valor === '1' ||
        $valor === 'true'
    ) {
        return true;
    }


    if (
        $valor === 0 ||
        $valor === '0' ||
        $valor === 'false'
    ) {
        return false;
    }


    return null;
}


function primewayFalhaValidacao(
    string $mensagem
): never {

    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                $mensagem
        ],
        400
    );
}


/*====================================================
                SEÇÕES RECEBIDAS
====================================================*/

$school =
    primewayObjeto(
        $dados[
            'school'
        ] ??
        null
    );

$academic =
    primewayObjeto(
        $dados[
            'academic'
        ] ??
        null
    );

$notifications =
    primewayObjeto(
        $dados[
            'notifications'
        ] ??
        null
    );

$system =
    primewayObjeto(
        $dados[
            'system'
        ] ??
        null
    );


/*====================================================
                    ESCOLA
====================================================*/

$schoolName =
    primewayTexto(
        $school[
            'name'
        ] ??
        ''
    );

$legalName =
    primewayTexto(
        $school[
            'legalName'
        ] ??
        ''
    );

$document =
    primewayTexto(
        $school[
            'document'
        ] ??
        ''
    );

$director =
    primewayTexto(
        $school[
            'director'
        ] ??
        ''
    );

$email =
    primewayTexto(
        $school[
            'email'
        ] ??
        ''
    );

$phone =
    primewayTexto(
        $school[
            'phone'
        ] ??
        ''
    );

$address =
    primewayTexto(
        $school[
            'address'
        ] ??
        ''
    );

$city =
    primewayTexto(
        $school[
            'city'
        ] ??
        ''
    );

$state =
    strtoupper(
        primewayTexto(
            $school[
                'state'
            ] ??
            ''
        )
    );

$zip =
    primewayTexto(
        $school[
            'zip'
        ] ??
        ''
    );


if (
    $schoolName ===
    ''
) {

    primewayFalhaValidacao(
        'Informe o nome da escola.'
    );
}


if (
    mb_strlen(
        $schoolName
    ) > 120
) {

    primewayFalhaValidacao(
        'O nome da escola é muito longo.'
    );
}


if (
    $email !==
        '' &&
    filter_var(
        $email,
        FILTER_VALIDATE_EMAIL
    ) ===
        false
) {

    primewayFalhaValidacao(
        'Informe um e-mail institucional válido.'
    );
}


if (
    mb_strlen(
        $state
    ) > 2
) {

    primewayFalhaValidacao(
        'O estado deve possuir no máximo 2 caracteres.'
    );
}


/*====================================================
                    ACADÊMICO
====================================================*/

$academicYear =
    $academic[
        'year'
    ] ??
    null;

$period =
    primewayTexto(
        $academic[
            'period'
        ] ??
        ''
    );

$passingAverage =
    primewayNumero(
        $academic[
            'passingAverage'
        ] ??
        null
    );

$minAttendance =
    primewayNumero(
        $academic[
            'minAttendance'
        ] ??
        null
    );

$classDuration =
    primewayNumero(
        $academic[
            'classDuration'
        ] ??
        null
    );

$schoolDays =
    primewayNumero(
        $academic[
            'schoolDays'
        ] ??
        null
    );

$defaultShift =
    primewayTexto(
        $academic[
            'defaultShift'
        ] ??
        ''
    );


$periodosPermitidos = [
    'Bimestral',
    'Trimestral',
    'Semestral'
];

$turnosPermitidos = [
    'Manhã',
    'Tarde',
    'Integral'
];


if (
    !in_array(
        $period,
        $periodosPermitidos,
        true
    )
) {

    primewayFalhaValidacao(
        'Organização de período inválida.'
    );
}


if (
    $passingAverage ===
        null ||
    $passingAverage < 0 ||
    $passingAverage > 10
) {

    primewayFalhaValidacao(
        'A média de aprovação deve estar entre 0 e 10.'
    );
}


if (
    $minAttendance ===
        null ||
    $minAttendance < 0 ||
    $minAttendance > 100
) {

    primewayFalhaValidacao(
        'A frequência mínima deve estar entre 0% e 100%.'
    );
}


if (
    $classDuration ===
        null ||
    $classDuration < 20 ||
    $classDuration > 180 ||
    floor(
        $classDuration
    ) !==
        $classDuration
) {

    primewayFalhaValidacao(
        'A duração da aula deve ser um número inteiro entre 20 e 180 minutos.'
    );
}


if (
    $schoolDays ===
        null ||
    $schoolDays < 1 ||
    $schoolDays > 365 ||
    floor(
        $schoolDays
    ) !==
        $schoolDays
) {

    primewayFalhaValidacao(
        'A quantidade de dias letivos deve ser um número inteiro entre 1 e 365.'
    );
}


if (
    !in_array(
        $defaultShift,
        $turnosPermitidos,
        true
    )
) {

    primewayFalhaValidacao(
        'Turno padrão inválido.'
    );
}


/*====================================================
                    NOTIFICAÇÕES
====================================================*/

$notifyCalendar =
    primewayBooleano(
        $notifications[
            'calendar'
        ] ??
        null
    );

$notifyAnnouncements =
    primewayBooleano(
        $notifications[
            'announcements'
        ] ??
        null
    );

$notifyGrades =
    primewayBooleano(
        $notifications[
            'grades'
        ] ??
        null
    );

$notifyAttendance =
    primewayBooleano(
        $notifications[
            'attendance'
        ] ??
        null
    );

$notifyGuardians =
    primewayBooleano(
        $notifications[
            'guardians'
        ] ??
        null
    );


if (
    $notifyCalendar === null ||
    $notifyAnnouncements === null ||
    $notifyGrades === null ||
    $notifyAttendance === null ||
    $notifyGuardians === null
) {

    primewayFalhaValidacao(
        'As preferências de notificações são inválidas.'
    );
}


/*====================================================
                    SISTEMA
====================================================*/

$dateFormat =
    primewayTexto(
        $system[
            'dateFormat'
        ] ??
        ''
    );

$defaultPage =
    primewayTexto(
        $system[
            'defaultPage'
        ] ??
        ''
    );

$timezone =
    primewayTexto(
        $system[
            'timezone'
        ] ??
        ''
    );


$formatosPermitidos = [
    'DD/MM/YYYY',
    'YYYY-MM-DD'
];

$paginasPermitidas = [
    'dashboard.html',
    'calendario.html',
    'notificacoes.html'
];

$fusosPermitidos = [
    'America/Sao_Paulo',
    'America/Manaus',
    'America/Rio_Branco'
];


if (
    !in_array(
        $dateFormat,
        $formatosPermitidos,
        true
    )
) {

    primewayFalhaValidacao(
        'Formato de data inválido.'
    );
}


if (
    !in_array(
        $defaultPage,
        $paginasPermitidas,
        true
    )
) {

    primewayFalhaValidacao(
        'Página inicial inválida.'
    );
}


if (
    !in_array(
        $timezone,
        $fusosPermitidos,
        true
    )
) {

    primewayFalhaValidacao(
        'Fuso horário inválido.'
    );
}


/*====================================================
            NORMALIZAR PÁGINA PARA O BANCO
====================================================*/

$defaultPageBanco =
    match (
        $defaultPage
    ) {

        'calendario.html' =>
            'calendario',

        'notificacoes.html' =>
            'notificacoes',

        default =>
            'dashboard'
    };


/*====================================================
        VALORES QUE SERÃO ATUALIZADOS
====================================================*/

$valores = [

    'escola' => [

        'nome' =>
            $schoolName,

        'razao_social' =>
            $legalName,

        'documento' =>
            $document,

        'diretor' =>
            $director,

        'email' =>
            $email,

        'telefone' =>
            $phone,

        'endereco' =>
            $address,

        'cidade' =>
            $city,

        'estado' =>
            $state,

        'cep' =>
            $zip
    ],


    'academico' => [

        'modelo_periodos_padrao' =>
            $period,

        'media_aprovacao' =>
            number_format(
                $passingAverage,
                2,
                '.',
                ''
            ),

        'frequencia_minima' =>
            number_format(
                $minAttendance,
                2,
                '.',
                ''
            ),

        'duracao_aula_minutos' =>
            (string) (
                (int) $classDuration
            ),

        'dias_letivos' =>
            (string) (
                (int) $schoolDays
            ),

        'turno_padrao' =>
            $defaultShift
    ],


    'notificacoes' => [

        'calendario' =>
            $notifyCalendar
                ? '1'
                : '0',

        'comunicados' =>
            $notifyAnnouncements
                ? '1'
                : '0',

        'notas' =>
            $notifyGrades
                ? '1'
                : '0',

        'frequencia' =>
            $notifyAttendance
                ? '1'
                : '0',

        'responsaveis' =>
            $notifyGuardians
                ? '1'
                : '0'
    ],


    'sistema' => [

        'formato_data' =>
            $dateFormat,

        'pagina_padrao' =>
            $defaultPageBanco,

        'fuso_horario' =>
            $timezone
    ]
];


/*====================================================
                    BANCO
====================================================*/

try {

    $pdo =
        primewayPdo();


    /*================================================
                ANO LETIVO OFICIAL
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


    $anoAtivo =
        $stmtAno->fetchColumn();


    if (
        $anoAtivo ===
        false
    ) {

        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'Nenhum ano letivo ativo foi encontrado.'
            ],
            409
        );
    }


    $anoAtivo =
        (int) $anoAtivo;


    /*
        O campo continua existindo no formulário atual,
        mas Configurações não é responsável por criar
        ou trocar anos_letivos.

        Se o usuário tentar alterar o valor, impedimos
        que a interface dê a impressão de que a mudança
        foi salva.
    */
    if (
        $academicYear !==
            null &&
        (int) $academicYear !==
            $anoAtivo
    ) {

        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'O ano letivo ativo deve ser gerenciado pela estrutura acadêmica.'
            ],
            409
        );
    }


    /*================================================
                    TRANSAÇÃO
    ================================================*/

    $pdo->beginTransaction();


    /*
        configuracoes_sistema já possui todas essas
        chaves através do primeway.sql.

        Portanto fazemos UPDATE das chaves oficiais
        em vez de criar configurações arbitrárias.
    */
    $stmtUpdate =
        $pdo->prepare(
            '
                UPDATE configuracoes_sistema
                SET
                    valor = :valor,
                    atualizado_por_usuario_id = :usuario_id
                WHERE grupo = :grupo
                  AND chave = :chave
                  AND editavel = 1
            '
        );


    foreach (
        $valores as $grupo =>
            $configuracoesGrupo
    ) {

        foreach (
            $configuracoesGrupo as $chave =>
                $valor
        ) {

            $stmtUpdate->execute([
                ':valor' =>
                    $valor,

                ':usuario_id' =>
                    $usuario[
                        'id'
                    ],

                ':grupo' =>
                    $grupo,

                ':chave' =>
                    $chave
            ]);
        }
    }


    /*================================================
                    AUDITORIA
    ================================================*/

    $stmtAuditoria =
        $pdo->prepare(
            '
                INSERT INTO auditoria (
                    usuario_id,
                    acao,
                    entidade,
                    descricao,
                    dados_novos
                )
                VALUES (
                    :usuario_id,
                    :acao,
                    :entidade,
                    :descricao,
                    :dados_novos
                )
            '
        );


    $stmtAuditoria->execute([
        ':usuario_id' =>
            $usuario[
                'id'
            ],

        ':acao' =>
            'ATUALIZAR_CONFIGURACOES',

        ':entidade' =>
            'configuracoes_sistema',

        ':descricao' =>
            'Configurações gerais do sistema atualizadas.',

        ':dados_novos' =>
            json_encode(
                [
                    'school' =>
                        $school,

                    'academic' => [
                        'year' =>
                            $anoAtivo,

                        'period' =>
                            $period,

                        'passingAverage' =>
                            $passingAverage,

                        'minAttendance' =>
                            $minAttendance,

                        'classDuration' =>
                            (int) $classDuration,

                        'schoolDays' =>
                            (int) $schoolDays,

                        'defaultShift' =>
                            $defaultShift
                    ],

                    'notifications' => [
                        'calendar' =>
                            $notifyCalendar,

                        'announcements' =>
                            $notifyAnnouncements,

                        'grades' =>
                            $notifyGrades,

                        'attendance' =>
                            $notifyAttendance,

                        'guardians' =>
                            $notifyGuardians
                    ],

                    'system' => [
                        'dateFormat' =>
                            $dateFormat,

                        'defaultPage' =>
                            $defaultPage,

                        'timezone' =>
                            $timezone
                    ]
                ],
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            )
    ]);


    $pdo->commit();


    primewayResponderJson(
        [
            'success' =>
                true,

            'message' =>
                'Configurações salvas com sucesso.'
        ]
    );

} catch (
    Throwable $erro
) {

    if (
        isset(
            $pdo
        ) &&
        $pdo instanceof PDO &&
        $pdo->inTransaction()
    ) {

        $pdo->rollBack();
    }


    error_log(
        'PrimeWay Configurações POST: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível salvar as configurações.'
        ],
        500
    );
}

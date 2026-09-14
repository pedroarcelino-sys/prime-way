<?php

declare(strict_types=1);

require_once __DIR__ . '/_atividade.php';


primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'aluno'
    ]);

primewayExigirCsrf();


/*====================================================
                    ATIVIDADE
====================================================*/

$atividadeId =
    primewayIdPositivo(
        $_POST['activityId']
        ?? null
    );


if ($atividadeId === null) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Atividade inválida.'
        ],
        400
    );
}


/*====================================================
                    ARQUIVO
====================================================*/

if (
    !isset($_FILES['file']) ||
    !is_array($_FILES['file'])
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Nenhum arquivo foi enviado.'
        ],
        400
    );
}


$arquivo =
    $_FILES['file'];


$erroUpload =
    (int) (
        $arquivo['error']
        ?? UPLOAD_ERR_NO_FILE
    );


if (
    $erroUpload !==
    UPLOAD_ERR_OK
) {

    $mensagem =
        match ($erroUpload) {

            UPLOAD_ERR_INI_SIZE,
            UPLOAD_ERR_FORM_SIZE =>
                'O arquivo excede o tamanho permitido pelo servidor.',

            UPLOAD_ERR_PARTIAL =>
                'O envio do arquivo foi interrompido.',

            UPLOAD_ERR_NO_FILE =>
                'Nenhum arquivo foi selecionado.',

            default =>
                'Não foi possível receber o arquivo.'
        };


    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                $mensagem
        ],
        422
    );
}


$nomeOriginal =
    trim(
        (string) (
            $arquivo['name']
            ?? ''
        )
    );


$caminhoTemporario =
    (string) (
        $arquivo['tmp_name']
        ?? ''
    );


$tamanho =
    (int) (
        $arquivo['size']
        ?? 0
    );


if (
    $nomeOriginal === '' ||
    $caminhoTemporario === '' ||
    $tamanho <= 0 ||
    !is_uploaded_file(
        $caminhoTemporario
    )
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'O arquivo recebido é inválido.'
        ],
        422
    );
}


/*====================================================
                EXTENSÃO
====================================================*/

$extensao =
    strtolower(
        pathinfo(
            $nomeOriginal,
            PATHINFO_EXTENSION
        )
    );


$extensoesPermitidas = [

    'pdf',

    'jpg',
    'jpeg',
    'png',
    'webp',

    'txt',

    'doc',
    'docx',

    'xls',
    'xlsx',

    'ppt',
    'pptx'
];


if (
    !in_array(
        $extensao,
        $extensoesPermitidas,
        true
    )
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Tipo de arquivo não permitido.'
        ],
        422
    );
}


/*====================================================
                    MIME TYPE
====================================================*/

$finfo =
    finfo_open(
        FILEINFO_MIME_TYPE
    );


if ($finfo === false) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível validar o arquivo.'
        ],
        500
    );
}


$mimeType =
    finfo_file(
        $finfo,
        $caminhoTemporario
    );


finfo_close(
    $finfo
);


if (
    !is_string($mimeType) ||
    $mimeType === ''
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível identificar o tipo do arquivo.'
        ],
        422
    );
}


/*====================================================
                VALIDAR MIME + EXTENSÃO
====================================================*/

$mimesPermitidos = [

    'pdf' => [
        'application/pdf'
    ],

    'jpg' => [
        'image/jpeg'
    ],

    'jpeg' => [
        'image/jpeg'
    ],

    'png' => [
        'image/png'
    ],

    'webp' => [
        'image/webp'
    ],

    'txt' => [
        'text/plain'
    ],

    'doc' => [
        'application/msword',
        'application/octet-stream'
    ],

    'docx' => [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip',
        'application/octet-stream'
    ],

    'xls' => [
        'application/vnd.ms-excel',
        'application/octet-stream'
    ],

    'xlsx' => [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
        'application/octet-stream'
    ],

    'ppt' => [
        'application/vnd.ms-powerpoint',
        'application/octet-stream'
    ],

    'pptx' => [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip',
        'application/octet-stream'
    ]
];


if (
    !isset(
        $mimesPermitidos[
            $extensao
        ]
    ) ||
    !in_array(
        $mimeType,
        $mimesPermitidos[
            $extensao
        ],
        true
    )
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'O conteúdo do arquivo não corresponde ao tipo informado.'
        ],
        422
    );
}


/*====================================================
                    BANCO
====================================================*/

try {

    $pdo =
        primewayPdo();


    $contexto =
        primewayAtividadesContextoAluno(
            $pdo,
            $usuario
        );


    $matricula =
        $contexto['enrollment'];


    if ($matricula === null) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'O aluno não possui matrícula ativa.'
            ],
            409
        );
    }


    $atividade =
        primewayObterAtividadeAluno(
            $pdo,
            $contexto,
            $atividadeId
        );


    if (
        (string) $atividade['status'] !==
        'Publicada'
    ) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Esta atividade não aceita novos arquivos.'
            ],
            409
        );
    }


    $prazoEncerrado =
        (int) $atividade[
            'prazo_encerrado'
        ] === 1;


    if (
        $prazoEncerrado &&
        (int) $atividade[
            'permite_atraso'
        ] !== 1
    ) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'O prazo desta atividade foi encerrado.'
            ],
            409
        );
    }


    /*================================================
                    TAMANHO
    ================================================*/

    $maximoMb =
        (int) $atividade[
            'tamanho_maximo_arquivo_mb'
        ];


    $maximoBytes =
        $maximoMb *
        1024 *
        1024;


    if (
        $tamanho >
        $maximoBytes
    ) {

        primewayResponderJson(
            [
                'success' => false,

                'message' =>
                    sprintf(
                        'O arquivo deve possuir no máximo %d MB.',
                        $maximoMb
                    )
            ],
            422
        );
    }


    $pdo->beginTransaction();


    /*================================================
                    ENTREGA
    ================================================*/

    $entrega =
        primewayObterEntregaAtividadeAluno(
            $pdo,
            (int) $matricula['id'],
            $atividadeId,
            true
        );


    if (
        $entrega !== null &&
        in_array(
            (string) $entrega['status'],
            [
                'Entregue',
                'Atrasada',
                'Reenviada',
                'Corrigida'
            ],
            true
        )
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Retire a entrega antes de modificar seus arquivos.'
            ],
            409
        );
    }


    if (
        $entrega !== null &&
        $entrega[
            'correcao_publicada_em'
        ] !== null
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Uma atividade corrigida não pode mais ser alterada.'
            ],
            409
        );
    }


    /*================================================
            CRIAR ENTREGA SE NÃO EXISTIR
    ================================================*/

    if ($entrega === null) {

        $stmt =
            $pdo->prepare(
                "INSERT INTO entregas_atividades (
                    atividade_id,
                    matricula_id,
                    status,
                    rascunho_salvo_em,
                    ultima_versao
                 )
                 VALUES (
                    :atividade_id,
                    :matricula_id,
                    'Rascunho',
                    NOW(),
                    1
                 )"
            );


        $stmt->execute([
            ':atividade_id' =>
                $atividadeId,

            ':matricula_id' =>
                (int) $matricula['id']
        ]);


        $entregaId =
            (int) $pdo->lastInsertId();


        $stmtVersao =
            $pdo->prepare(
                "INSERT INTO entrega_atividade_versoes (
                    entrega_id,
                    numero_versao,
                    status,
                    salva_em
                 )
                 VALUES (
                    :entrega_id,
                    1,
                    'Rascunho',
                    NOW()
                 )"
            );


        $stmtVersao->execute([
            ':entrega_id' =>
                $entregaId
        ]);


        $versaoId =
            (int) $pdo->lastInsertId();

        $numeroVersao =
            1;

    } else {

        $entregaId =
            (int) $entrega['id'];


        $ultimaVersao =
            primewayUltimaVersaoEntrega(
                $pdo,
                $entregaId,
                true
            );


        if (
            $ultimaVersao !== null &&
            (string) $ultimaVersao['status'] ===
            'Rascunho'
        ) {

            $versaoId =
                (int) $ultimaVersao['id'];

            $numeroVersao =
                (int) $ultimaVersao[
                    'numero_versao'
                ];

        } else {

            $numeroVersao =
                max(
                    1,
                    (int) $entrega[
                        'ultima_versao'
                    ] + 1
                );


            $stmtVersao =
                $pdo->prepare(
                    "INSERT INTO entrega_atividade_versoes (
                        entrega_id,
                        numero_versao,
                        status,
                        salva_em
                     )
                     VALUES (
                        :entrega_id,
                        :numero_versao,
                        'Rascunho',
                        NOW()
                     )"
                );


            $stmtVersao->execute([
                ':entrega_id' =>
                    $entregaId,

                ':numero_versao' =>
                    $numeroVersao
            ]);


            $versaoId =
                (int) $pdo->lastInsertId();
        }


        $stmtEntrega =
            $pdo->prepare(
                "UPDATE entregas_atividades

                 SET
                    status = 'Rascunho',
                    rascunho_salvo_em = NOW(),
                    retirada_em = NULL,
                    ultima_versao = :versao

                 WHERE id = :id"
            );


        $stmtEntrega->execute([
            ':versao' =>
                $numeroVersao,

            ':id' =>
                $entregaId
        ]);
    }


    /*================================================
            QUANTIDADE MÁXIMA DE ARQUIVOS
    ================================================*/

    $quantidadeAtual =
        primewayQuantidadeArquivosVersao(
            $pdo,
            $versaoId
        );


    $maxArquivos =
        (int) $atividade[
            'max_arquivos'
        ];


    if (
        $quantidadeAtual >=
        $maxArquivos
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,

                'message' =>
                    sprintf(
                        'Esta atividade permite no máximo %d arquivo(s).',
                        $maxArquivos
                    )
            ],
            422
        );
    }


    /*================================================
                DIRETÓRIO FÍSICO
    ================================================*/

    $diretorioBase =
        dirname(
            __DIR__,
            3
        ) .
        '/storage/atividades';


    if (
        !is_dir(
            $diretorioBase
        ) &&
        !mkdir(
            $diretorioBase,
            0775,
            true
        ) &&
        !is_dir(
            $diretorioBase
        )
    ) {

        throw new RuntimeException(
            'Não foi possível criar o diretório de armazenamento.'
        );
    }


    /*================================================
                NOME SEGURO
    ================================================*/

    $nomeArmazenado =
        bin2hex(
            random_bytes(24)
        ) .
        '.' .
        $extensao;


    $caminhoFinal =
        $diretorioBase .
        DIRECTORY_SEPARATOR .
        $nomeArmazenado;


    if (
        !move_uploaded_file(
            $caminhoTemporario,
            $caminhoFinal
        )
    ) {

        throw new RuntimeException(
            'Não foi possível armazenar o arquivo.'
        );
    }


    /*================================================
                    STORAGE KEY
    ================================================*/

    $storageKey =
        'atividades/' .
        $nomeArmazenado;


    /*================================================
                    BANCO
    ================================================*/

    try {

        $stmt =
            $pdo->prepare(
                "INSERT INTO entrega_atividade_arquivos (
                    versao_id,
                    nome_original,
                    nome_armazenado,
                    storage_key,
                    mime_type,
                    tamanho_bytes
                 )
                 VALUES (
                    :versao_id,
                    :nome_original,
                    :nome_armazenado,
                    :storage_key,
                    :mime_type,
                    :tamanho_bytes
                 )"
            );


        $stmt->execute([
            ':versao_id' =>
                $versaoId,

            ':nome_original' =>
                $nomeOriginal,

            ':nome_armazenado' =>
                $nomeArmazenado,

            ':storage_key' =>
                $storageKey,

            ':mime_type' =>
                $mimeType,

            ':tamanho_bytes' =>
                $tamanho
        ]);


        $arquivoId =
            (int) $pdo->lastInsertId();


        primewayAuditarAtividade(
            $pdo,
            (int) $usuario['id'],
            'ANEXAR_ARQUIVO_ATIVIDADE',
            $entregaId,
            'Aluno adicionou um arquivo à atividade.',
            null,
            [
                'fileId' =>
                    $arquivoId,

                'name' =>
                    $nomeOriginal,

                'version' =>
                    $numeroVersao
            ]
        );


        $pdo->commit();


    } catch (Throwable $erroBanco) {

        if (
            is_file(
                $caminhoFinal
            )
        ) {
            unlink(
                $caminhoFinal
            );
        }


        throw $erroBanco;
    }


    primewayResponderJson([
        'success' => true,

        'message' =>
            'Arquivo adicionado com sucesso.',

        'file' => [

            'id' =>
                $arquivoId,

            'name' =>
                $nomeOriginal,

            'mimeType' =>
                $mimeType,

            'sizeBytes' =>
                $tamanho,

            'version' =>
                $numeroVersao
        ]
    ]);


} catch (Throwable $erro) {

    if (
        isset($pdo) &&
        $pdo instanceof PDO &&
        $pdo->inTransaction()
    ) {

        $pdo->rollBack();
    }


    error_log(
        'PrimeWay Upload Atividade: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível adicionar o arquivo.'
        ],
        500
    );
}
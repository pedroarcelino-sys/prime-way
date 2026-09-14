<?php

declare(strict_types=1);

require_once __DIR__ . '/_atividade.php';


primewayExigirMetodo('GET');


$usuario =
    primewayExigirPerfis([
        'aluno'
    ]);


$tipo =
    strtolower(
        trim(
            (string) (
                $_GET['type']
                ?? ''
            )
        )
    );


$arquivoId =
    primewayIdPositivo(
        $_GET['id']
        ?? null
    );


if (
    $arquivoId === null ||
    !in_array(
        $tipo,
        [
            'activity',
            'submission',
            'correction'
        ],
        true
    )
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Arquivo inválido.'
        ],
        400
    );
}


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


    $arquivo =
        null;


    /*================================================
            ANEXO PUBLICADO PELO PROFESSOR
    ================================================*/

    if ($tipo === 'activity') {

        $stmt =
            $pdo->prepare(
                "SELECT
                    aa.nome_original,
                    aa.storage_key,
                    aa.mime_type,
                    aa.tamanho_bytes

                 FROM atividade_anexos aa

                 INNER JOIN atividades atv
                    ON atv.id =
                       aa.atividade_id

                 INNER JOIN turma_disciplinas td
                    ON td.id =
                       atv.turma_disciplina_id

                 WHERE
                    aa.id =
                    :arquivo_id

                    AND
                    td.turma_id =
                    :turma_id

                    AND
                    atv.status IN (
                        'Publicada',
                        'Encerrada'
                    )

                    AND (
                        atv.data_publicacao IS NULL
                        OR
                        atv.data_publicacao <= NOW()
                    )

                 LIMIT 1"
            );


        $stmt->execute([
            ':arquivo_id' =>
                $arquivoId,

            ':turma_id' =>
                (int) $matricula[
                    'classId'
                ]
        ]);


        $arquivo =
            $stmt->fetch()
            ?: null;
    }


    /*================================================
                ARQUIVO DO ALUNO
    ================================================*/

    if ($tipo === 'submission') {

        $stmt =
            $pdo->prepare(
                "SELECT
                    ar.nome_original,
                    ar.storage_key,
                    ar.mime_type,
                    ar.tamanho_bytes

                 FROM entrega_atividade_arquivos ar

                 INNER JOIN entrega_atividade_versoes v
                    ON v.id =
                       ar.versao_id

                 INNER JOIN entregas_atividades ea
                    ON ea.id =
                       v.entrega_id

                 WHERE
                    ar.id =
                    :arquivo_id

                    AND
                    ea.matricula_id =
                    :matricula_id

                 LIMIT 1"
            );


        $stmt->execute([
            ':arquivo_id' =>
                $arquivoId,

            ':matricula_id' =>
                (int) $matricula[
                    'id'
                ]
        ]);


        $arquivo =
            $stmt->fetch()
            ?: null;
    }


    /*================================================
                ARQUIVO DA CORREÇÃO
    ================================================*/

    if ($tipo === 'correction') {

        $stmt =
            $pdo->prepare(
                "SELECT
                    ca.nome_original,
                    ca.storage_key,
                    ca.mime_type,
                    ca.tamanho_bytes

                 FROM entrega_correcao_arquivos ca

                 INNER JOIN entregas_atividades ea
                    ON ea.id =
                       ca.entrega_id

                 WHERE
                    ca.id =
                    :arquivo_id

                    AND
                    ea.matricula_id =
                    :matricula_id

                    AND
                    ea.correcao_publicada_em IS NOT NULL

                 LIMIT 1"
            );


        $stmt->execute([
            ':arquivo_id' =>
                $arquivoId,

            ':matricula_id' =>
                (int) $matricula[
                    'id'
                ]
        ]);


        $arquivo =
            $stmt->fetch()
            ?: null;
    }


    if ($arquivo === null) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Arquivo não encontrado ou acesso não autorizado.'
            ],
            404
        );
    }


    /*================================================
                CAMINHO SEGURO
    ================================================*/

    $storageKey =
        str_replace(
            '\\',
            '/',
            (string) $arquivo[
                'storage_key'
            ]
        );


    if (
        !str_starts_with(
            $storageKey,
            'atividades/'
        )
    ) {

        throw new RuntimeException(
            'Storage key inválida.'
        );
    }


    $nomeArmazenado =
        basename(
            $storageKey
        );


    $caminho =
        dirname(
            __DIR__,
            3
        ) .
        '/storage/atividades/' .
        $nomeArmazenado;


    if (
        !is_file(
            $caminho
        ) ||
        !is_readable(
            $caminho
        )
    ) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'O arquivo físico não foi encontrado.'
            ],
            404
        );
    }


    /*================================================
                    DOWNLOAD
    ================================================*/

    $nomeOriginal =
        (string) $arquivo[
            'nome_original'
        ];


    $nomeSeguro =
        str_replace(
            [
                "\r",
                "\n",
                '"'
            ],
            '',
            $nomeOriginal
        );


    header_remove(
        'Content-Type'
    );


    header(
        'Content-Type: ' .
        (string) $arquivo[
            'mime_type'
        ]
    );


    header(
        'Content-Length: ' .
        filesize(
            $caminho
        )
    );


    header(
        "Content-Disposition: inline; filename=\"arquivo\"; filename*=UTF-8''" .
        rawurlencode(
            $nomeSeguro
        )
    );


    header(
        'X-Content-Type-Options: nosniff'
    );


    header(
        'Cache-Control: private, no-store, max-age=0'
    );


    readfile(
        $caminho
    );


    exit;


} catch (Throwable $erro) {

    error_log(
        'PrimeWay Arquivo Atividade: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível abrir o arquivo.'
        ],
        500
    );
}
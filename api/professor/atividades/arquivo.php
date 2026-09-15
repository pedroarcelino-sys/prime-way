<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';


primewayExigirMetodo('GET');


$usuario =
    primewayExigirPerfis([
        'professor'
    ]);


/*====================================================
                    ARQUIVO
====================================================*/

$arquivoId =
    primewayIdPositivo(
        $_GET['id']
        ?? null
    );


if ($arquivoId === null) {

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


    /*====================================================
                    PROFESSOR
    ====================================================*/

    $stmtProfessor =
        $pdo->prepare(
            "SELECT
                pr.id

             FROM usuarios u

             INNER JOIN pessoas pe
                ON pe.id =
                   u.pessoa_id

             INNER JOIN professores pr
                ON pr.pessoa_id =
                   pe.id

             WHERE
                u.id =
                :usuario_id

             LIMIT 1"
        );


    $stmtProfessor->execute([
        ':usuario_id' =>
            (int) $usuario['id']
    ]);


    $professor =
        $stmtProfessor->fetch();


    if (!$professor) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Esta conta não está vinculada a um professor.'
            ],
            404
        );
    }


    $professorId =
        (int) $professor['id'];


    /*====================================================
            BUSCAR ARQUIVO COM AUTORIZAÇÃO
    ====================================================*/

    $stmtArquivo =
        $pdo->prepare(
            "SELECT

                ar.nome_original,
                ar.storage_key,
                ar.mime_type,
                ar.tamanho_bytes,

                atv.id AS atividade_id,
                ea.id AS entrega_id

             FROM entrega_atividade_arquivos ar

             INNER JOIN entrega_atividade_versoes v
                ON v.id =
                   ar.versao_id

             INNER JOIN entregas_atividades ea
                ON ea.id =
                   v.entrega_id

             INNER JOIN atividades atv
                ON atv.id =
                   ea.atividade_id

             INNER JOIN turma_disciplinas td
                ON td.id =
                   atv.turma_disciplina_id

             WHERE
                ar.id =
                :arquivo_id

                AND
                td.professor_id =
                :professor_id

             LIMIT 1"
        );


    $stmtArquivo->execute([
        ':arquivo_id' =>
            $arquivoId,

        ':professor_id' =>
            $professorId
    ]);


    $arquivo =
        $stmtArquivo->fetch();


    if (!$arquivo) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Arquivo não encontrado ou acesso não autorizado.'
            ],
            404
        );
    }


    /*====================================================
                VALIDAR STORAGE KEY
    ====================================================*/

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


    /*
        Usamos apenas o nome final do arquivo.
        Isso impede tentativa de sair da pasta
        storage/atividades.
    */

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


    /*====================================================
                VALIDAR ARQUIVO FÍSICO
    ====================================================*/

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


    /*====================================================
                NOME ORIGINAL
    ====================================================*/

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


    /*====================================================
                    MIME TYPE
    ====================================================*/

    $mimeType =
        trim(
            (string) (
                $arquivo[
                    'mime_type'
                ]
                ?? ''
            )
        );


    if ($mimeType === '') {

        $mimeType =
            'application/octet-stream';
    }


    /*====================================================
                    ENVIAR ARQUIVO
    ====================================================*/

    header_remove(
        'Content-Type'
    );


    header(
        'Content-Type: ' .
        $mimeType
    );


    header(
        'Content-Length: ' .
        filesize(
            $caminho
        )
    );


    /*
        inline permite que PDF/imagem abra
        diretamente no navegador.
    */

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
        'PrimeWay Professor Arquivo Entrega: ' .
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
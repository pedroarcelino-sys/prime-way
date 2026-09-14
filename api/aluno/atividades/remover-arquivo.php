<?php

declare(strict_types=1);

require_once __DIR__ . '/_atividade.php';


primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'aluno'
    ]);

primewayExigirCsrf();


$dados =
    primewayLerJson();


$arquivoId =
    primewayIdPositivo(
        $dados['fileId']
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


    $pdo->beginTransaction();


    /*================================================
                LOCALIZAR ARQUIVO
    ================================================*/

    $stmt =
        $pdo->prepare(
            "SELECT
                ar.id,
                ar.nome_original,
                ar.storage_key,

                v.id AS versao_id,
                v.status AS versao_status,

                ea.id AS entrega_id,
                ea.atividade_id,
                ea.status AS entrega_status,

                td.turma_id

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
                ea.matricula_id =
                :matricula_id

                AND
                td.turma_id =
                :turma_id

             LIMIT 1

             FOR UPDATE"
        );


    $stmt->execute([
        ':arquivo_id' =>
            $arquivoId,

        ':matricula_id' =>
            (int) $matricula['id'],

        ':turma_id' =>
            (int) $matricula['classId']
    ]);


    $arquivo =
        $stmt->fetch();


    if (!$arquivo) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Arquivo não encontrado.'
            ],
            404
        );
    }


    if (
        (string) $arquivo[
            'versao_status'
        ] !==
        'Rascunho'
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Arquivos de uma versão já enviada não podem ser removidos.'
            ],
            409
        );
    }


    if (
        (string) $arquivo[
            'entrega_status'
        ] ===
        'Corrigida'
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Uma atividade corrigida não pode ser alterada.'
            ],
            409
        );
    }


    /*================================================
                    EXCLUIR BANCO
    ================================================*/

    $stmtExcluir =
        $pdo->prepare(
            "DELETE FROM entrega_atividade_arquivos

             WHERE id =
             :id"
        );


    $stmtExcluir->execute([
        ':id' =>
            $arquivoId
    ]);


    primewayAuditarAtividade(
        $pdo,
        (int) $usuario['id'],
        'REMOVER_ARQUIVO_ATIVIDADE',
        (int) $arquivo['entrega_id'],
        'Aluno removeu um arquivo do rascunho.',
        [
            'fileId' =>
                $arquivoId,

            'name' =>
                (string) $arquivo[
                    'nome_original'
                ]
        ],
        null
    );


    $pdo->commit();


    /*================================================
                EXCLUIR ARQUIVO FÍSICO
    ================================================*/

    $storageKey =
        (string) $arquivo[
            'storage_key'
        ];


    $storageKey =
        str_replace(
            '\\',
            '/',
            $storageKey
        );


    if (
        str_starts_with(
            $storageKey,
            'atividades/'
        )
    ) {

        $nome =
            basename(
                $storageKey
            );


        $caminho =
            dirname(
                __DIR__,
                3
            ) .
            '/storage/atividades/' .
            $nome;


        if (
            is_file(
                $caminho
            )
        ) {

            @unlink(
                $caminho
            );
        }
    }


    primewayResponderJson([
        'success' => true,

        'message' =>
            'Arquivo removido com sucesso.'
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
        'PrimeWay Remover Arquivo: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível remover o arquivo.'
        ],
        500
    );
}
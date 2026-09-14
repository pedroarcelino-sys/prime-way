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


$atividadeId =
    primewayIdPositivo(
        $dados['activityId']
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
                    'Esta atividade não está aberta para entrega.'
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


    $pdo->beginTransaction();


    $entrega =
        primewayObterEntregaAtividadeAluno(
            $pdo,
            (int) $matricula['id'],
            $atividadeId,
            true
        );


    if ($entrega === null) {

        $stmt =
            $pdo->prepare(
                "INSERT INTO entregas_atividades (
                    atividade_id,
                    matricula_id,
                    status,
                    ultima_versao
                 )
                 VALUES (
                    :atividade_id,
                    :matricula_id,
                    'Pendente',
                    0
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


        $entrega =
            primewayObterEntregaAtividadeAluno(
                $pdo,
                (int) $matricula['id'],
                $atividadeId,
                true
            );

    } else {

        $entregaId =
            (int) $entrega['id'];
    }


    if (
        in_array(
            (string) $entrega['status'],
            [
                'Entregue',
                'Atrasada',
                'Reenviada'
            ],
            true
        )
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'A atividade já está entregue.'
            ],
            409
        );
    }


    if (
        (string) $entrega['status'] ===
        'Corrigida' ||
        $entrega[
            'correcao_publicada_em'
        ] !== null
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Esta atividade já foi corrigida.'
            ],
            409
        );
    }


    $ultimaVersao =
        primewayUltimaVersaoEntrega(
            $pdo,
            $entregaId,
            true
        );


    /*================================================
                CRIAR VERSÃO SE PRECISAR
    ================================================*/

    if (
        $ultimaVersao === null ||
        (string) $ultimaVersao['status'] !==
        'Rascunho'
    ) {

        $numeroVersao =
            max(
                1,
                (int) $entrega[
                    'ultima_versao'
                ] + 1
            );


        $conteudo =
            trim(
                (string) (
                    $dados['content']
                    ?? ''
                )
            );


        $link =
            trim(
                (string) (
                    $dados['link']
                    ?? ''
                )
            );


        $stmt =
            $pdo->prepare(
                "INSERT INTO entrega_atividade_versoes (
                    entrega_id,
                    numero_versao,
                    conteudo,
                    link_resposta,
                    status,
                    salva_em
                 )
                 VALUES (
                    :entrega_id,
                    :numero_versao,
                    :conteudo,
                    :link,
                    'Rascunho',
                    NOW()
                 )"
            );


        $stmt->execute([
            ':entrega_id' =>
                $entregaId,

            ':numero_versao' =>
                $numeroVersao,

            ':conteudo' =>
                $conteudo !== ''
                    ? $conteudo
                    : null,

            ':link' =>
                $link !== ''
                    ? $link
                    : null
        ]);


        $versaoId =
            (int) $pdo->lastInsertId();


        $ultimaVersao = [
            'id' =>
                $versaoId,

            'numero_versao' =>
                $numeroVersao,

            'conteudo' =>
                $conteudo,

            'link_resposta' =>
                $link
        ];

    } else {

        $numeroVersao =
            (int) $ultimaVersao[
                'numero_versao'
            ];


        $versaoId =
            (int) $ultimaVersao[
                'id'
            ];


        $conteudo =
            array_key_exists(
                'content',
                $dados
            )
                ? trim(
                    (string) $dados[
                        'content'
                    ]
                )
                : (string) (
                    $ultimaVersao[
                        'conteudo'
                    ] ?? ''
                );


        $link =
            array_key_exists(
                'link',
                $dados
            )
                ? trim(
                    (string) $dados[
                        'link'
                    ]
                )
                : (string) (
                    $ultimaVersao[
                        'link_resposta'
                    ] ?? ''
                );


        $stmt =
            $pdo->prepare(
                "UPDATE entrega_atividade_versoes

                 SET
                    conteudo = :conteudo,
                    link_resposta = :link,
                    salva_em = NOW()

                 WHERE id = :id"
            );


        $stmt->execute([
            ':conteudo' =>
                $conteudo !== ''
                    ? $conteudo
                    : null,

            ':link' =>
                $link !== ''
                    ? $link
                    : null,

            ':id' =>
                $versaoId
        ]);
    }


    $quantidadeArquivos =
        primewayQuantidadeArquivosVersao(
            $pdo,
            $versaoId
        );


    primewayValidarConteudoAtividade(
        (string) $atividade[
            'tipo_entrega'
        ],
        $conteudo,
        $link,
        $quantidadeArquivos
    );


    /*================================================
                JÁ EXISTIU ENVIO?
    ================================================*/

    $stmtEnvios =
        $pdo->prepare(
            "SELECT COUNT(*)

             FROM entrega_atividade_versoes

             WHERE
                entrega_id =
                :entrega_id

                AND
                enviada_em IS NOT NULL"
        );


    $stmtEnvios->execute([
        ':entrega_id' =>
            $entregaId
    ]);


    $jaFoiEnviada =
        (int) $stmtEnvios->fetchColumn()
        > 0;


    /*================================================
                    STATUS FINAL
    ================================================*/

    if ($prazoEncerrado) {

        $statusFinal =
            'Atrasada';

    } elseif ($jaFoiEnviada) {

        $statusFinal =
            'Reenviada';

    } else {

        $statusFinal =
            'Entregue';
    }


    /*================================================
                    ENVIAR VERSÃO
    ================================================*/

    $stmtVersao =
        $pdo->prepare(
            "UPDATE entrega_atividade_versoes

             SET
                conteudo = :conteudo,
                link_resposta = :link,
                status = 'Enviada',
                salva_em = NOW(),
                enviada_em = NOW(),
                retirada_em = NULL

             WHERE id = :id"
        );


    $stmtVersao->execute([
        ':conteudo' =>
            $conteudo !== ''
                ? $conteudo
                : null,

        ':link' =>
            $link !== ''
                ? $link
                : null,

        ':id' =>
            $versaoId
    ]);


    /*================================================
                    ENTREGA PRINCIPAL
    ================================================*/

    $stmtEntrega =
        $pdo->prepare(
            "UPDATE entregas_atividades

             SET
                conteudo = :conteudo,
                link_resposta = :link,
                status = :status,
                entregue_em = NOW(),
                rascunho_salvo_em = NULL,
                retirada_em = NULL,
                ultima_versao = :versao

             WHERE id = :id"
        );


    $stmtEntrega->execute([
        ':conteudo' =>
            $conteudo !== ''
                ? $conteudo
                : null,

        ':link' =>
            $link !== ''
                ? $link
                : null,

        ':status' =>
            $statusFinal,

        ':versao' =>
            $numeroVersao,

        ':id' =>
            $entregaId
    ]);


    primewayAuditarAtividade(
        $pdo,
        (int) $usuario['id'],
        'ENVIAR_ATIVIDADE',
        $entregaId,
        'Aluno enviou uma atividade.',
        null,
        [
            'atividadeId' =>
                $atividadeId,

            'status' =>
                $statusFinal,

            'versao' =>
                $numeroVersao
        ]
    );


    $pdo->commit();


    primewayResponderJson([
        'success' => true,

        'message' =>
            $statusFinal === 'Atrasada'
                ? 'Atividade enviada com atraso.'
                : 'Atividade enviada com sucesso.',

        'submission' => [
            'id' =>
                $entregaId,

            'status' =>
                $statusFinal,

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
        'PrimeWay Enviar Atividade: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível enviar a atividade.'
        ],
        500
    );
}
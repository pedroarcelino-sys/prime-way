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
        $dados['activityId'] ?? null
    );


if ($atividadeId === null) {

    primewayResponderJson(
        [
            'success' => false,
            'message' => 'Atividade inválida.'
        ],
        400
    );
}


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


if (
    strlen($conteudo) > 100000 ||
    strlen($link) > 1000
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'A resposta enviada excede o tamanho permitido.'
        ],
        422
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
                    'Esta atividade não aceita novas alterações.'
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


    if (
        $entrega !== null &&
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
                    'A atividade já foi enviada. Retire a entrega antes de editá-la.'
            ],
            409
        );
    }


    if (
        $entrega !== null &&
        (
            (string) $entrega['status'] ===
            'Corrigida' ||
            $entrega[
                'correcao_publicada_em'
            ] !== null
        )
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Uma atividade já corrigida não pode mais ser alterada.'
            ],
            409
        );
    }


    /*================================================
                CRIAR ENTREGA
    ================================================*/

    if ($entrega === null) {

        $stmt =
            $pdo->prepare(
                "INSERT INTO entregas_atividades (
                    atividade_id,
                    matricula_id,
                    conteudo,
                    link_resposta,
                    status,
                    rascunho_salvo_em,
                    ultima_versao
                 )
                 VALUES (
                    :atividade_id,
                    :matricula_id,
                    :conteudo,
                    :link,
                    'Rascunho',
                    NOW(),
                    1
                 )"
            );


        $stmt->execute([
            ':atividade_id' =>
                $atividadeId,

            ':matricula_id' =>
                (int) $matricula['id'],

            ':conteudo' =>
                $conteudo !== ''
                    ? $conteudo
                    : null,

            ':link' =>
                $link !== ''
                    ? $link
                    : null
        ]);


        $entregaId =
            (int) $pdo->lastInsertId();


        $stmtVersao =
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
                    1,
                    :conteudo,
                    :link,
                    'Rascunho',
                    NOW()
                 )"
            );


        $stmtVersao->execute([
            ':entrega_id' =>
                $entregaId,

            ':conteudo' =>
                $conteudo !== ''
                    ? $conteudo
                    : null,

            ':link' =>
                $link !== ''
                    ? $link
                    : null
        ]);


        $versao =
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

            $versao =
                (int) $ultimaVersao[
                    'numero_versao'
                ];


            $stmtVersao =
                $pdo->prepare(
                    "UPDATE entrega_atividade_versoes

                     SET
                        conteudo = :conteudo,
                        link_resposta = :link,
                        salva_em = NOW()

                     WHERE
                        id = :id"
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
                    (int) $ultimaVersao['id']
            ]);

        } else {

            $versao =
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


            $stmtVersao->execute([
                ':entrega_id' =>
                    $entregaId,

                ':numero_versao' =>
                    $versao,

                ':conteudo' =>
                    $conteudo !== ''
                        ? $conteudo
                        : null,

                ':link' =>
                    $link !== ''
                        ? $link
                        : null
            ]);
        }


        $stmtEntrega =
            $pdo->prepare(
                "UPDATE entregas_atividades

                 SET
                    conteudo = :conteudo,
                    link_resposta = :link,
                    status = 'Rascunho',
                    rascunho_salvo_em = NOW(),
                    retirada_em = NULL,
                    ultima_versao = :ultima_versao

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

            ':ultima_versao' =>
                $versao,

            ':id' =>
                $entregaId
        ]);
    }


    primewayAuditarAtividade(
        $pdo,
        (int) $usuario['id'],
        'SALVAR_RASCUNHO',
        $entregaId,
        'Aluno salvou o rascunho de uma atividade.',
        null,
        [
            'atividadeId' =>
                $atividadeId,

            'versao' =>
                $versao
        ]
    );


    $pdo->commit();


    primewayResponderJson([
        'success' => true,

        'message' =>
            'Rascunho salvo com sucesso.',

        'submission' => [
            'id' =>
                $entregaId,

            'status' =>
                'Rascunho',

            'version' =>
                $versao
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
        'PrimeWay Salvar Rascunho: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível salvar o rascunho.'
        ],
        500
    );
}
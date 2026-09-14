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
        (int) $atividade[
            'permite_reenvio'
        ] !== 1
    ) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'O professor não permitiu reenvio nesta atividade.'
            ],
            409
        );
    }


    if (
        (int) $atividade[
            'prazo_encerrado'
        ] === 1
    ) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Não é possível retirar a atividade após o prazo.'
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

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Nenhuma entrega foi encontrada.'
            ],
            404
        );
    }


    if (
        !in_array(
            (string) $entrega[
                'status'
            ],
            [
                'Entregue',
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
                    'Esta entrega não pode ser retirada.'
            ],
            409
        );
    }


    if (
        $entrega[
            'correcao_publicada_em'
        ] !== null ||
        (string) $entrega[
            'status'
        ] ===
        'Corrigida'
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Uma atividade corrigida não pode ser retirada.'
            ],
            409
        );
    }


    $ultimaVersao =
        primewayUltimaVersaoEntrega(
            $pdo,
            (int) $entrega['id'],
            true
        );


    if (
        $ultimaVersao === null ||
        (string) $ultimaVersao[
            'status'
        ] !==
        'Enviada'
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'A versão enviada da atividade não foi encontrada.'
            ],
            409
        );
    }


    $stmt =
        $pdo->prepare(
            "UPDATE entrega_atividade_versoes

             SET
                status = 'Retirada',
                retirada_em = NOW()

             WHERE id = :id"
        );


    $stmt->execute([
        ':id' =>
            (int) $ultimaVersao['id']
    ]);


    $stmtEntrega =
        $pdo->prepare(
            "UPDATE entregas_atividades

             SET
                status = 'Cancelada',
                retirada_em = NOW()

             WHERE id = :id"
        );


    $stmtEntrega->execute([
        ':id' =>
            (int) $entrega['id']
    ]);


    primewayAuditarAtividade(
        $pdo,
        (int) $usuario['id'],
        'RETIRAR_ATIVIDADE',
        (int) $entrega['id'],
        'Aluno retirou uma entrega.',
        [
            'status' =>
                (string) $entrega['status']
        ],
        [
            'status' =>
                'Cancelada'
        ]
    );


    $pdo->commit();


    primewayResponderJson([
        'success' => true,

        'message' =>
            'Entrega retirada. Você pode alterá-la e enviar novamente.'
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
        'PrimeWay Retirar Atividade: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível retirar a atividade.'
        ],
        500
    );
}
<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';

primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'responsavel'
    ]);

primewayExigirCsrf();

$dados =
    primewayLerJson();

$requestId =
    primewayIdPositivo(
        $dados['requestId']
        ?? null
    );

if ($requestId === null) {
    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Solicitação inválida.'
        ],
        422
    );
}

try {

    $pdo =
        primewayPdo();

    $contexto =
        primewayResponsavelContexto(
            $pdo,
            $usuario
        );

    $guardianId =
        (int) $contexto[
            'profile'
        ][
            'guardianId'
        ];

    $pdo->beginTransaction();

    $stmt =
        $pdo->prepare(
            "
                SELECT
                    id,
                    status

                FROM solicitacoes_saida_segura

                WHERE id =
                    :solicitacao_id

                  AND responsavel_id =
                    :responsavel_id

                LIMIT 1

                FOR UPDATE
            "
        );

    $stmt->execute([
        ':solicitacao_id' =>
            $requestId,

        ':responsavel_id' =>
            $guardianId
    ]);

    $request =
        $stmt->fetch();

    if (!$request) {

        $pdo->rollBack();

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Solicitação não encontrada.'
            ],
            404
        );
    }

    if (
        !in_array(
            $request['status'],
            [
                'Aguardando',
                'No raio',
                'Preparando'
            ],
            true
        )
    ) {

        $pdo->rollBack();

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Esta solicitação já foi encerrada.'
            ],
            409
        );
    }

    $pdo->prepare(
        "
            UPDATE solicitacoes_saida_segura

            SET
                status = 'Cancelado',
                cancelado_em = CURRENT_TIMESTAMP

            WHERE id =
                :solicitacao_id
        "
    )->execute([
        ':solicitacao_id' =>
            $requestId
    ]);

    $pdo->prepare(
        "
            INSERT INTO historico_saida_segura (
                solicitacao_id,
                usuario_id,
                status_anterior,
                status_novo,
                observacao
            )
            VALUES (
                :solicitacao_id,
                :usuario_id,
                :status_anterior,
                'Cancelado',
                'Solicitação cancelada pelo responsável.'
            )
        "
    )->execute([
        ':solicitacao_id' =>
            $requestId,

        ':usuario_id' =>
            (int) $usuario['id'],

        ':status_anterior' =>
            (string) $request['status']
    ]);

    $pdo->commit();

    primewayResponderJson([
        'success' => true,
        'message' =>
            'Solicitação cancelada.'
    ]);

} catch (Throwable $erro) {

    if (
        isset($pdo)
        &&
        $pdo instanceof PDO
        &&
        $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }

    error_log(
        'PrimeWay Responsável Saída Segura Cancelar POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível cancelar a solicitação.'
        ],
        500
    );
}

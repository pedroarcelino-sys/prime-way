<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';
require_once __DIR__ . '/_chat.php';

primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'responsavel'
    ]);

primewayExigirCsrf();

$dados =
    primewayLerJson();

$contactUserId =
    primewayIdPositivo(
        $dados['contactUserId']
        ?? null
    );

if ($contactUserId === null) {
    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Contato inválido.'
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

    $contato =
        primewayResponsavelChatContatoPermitido(
            $pdo,
            $contexto,
            $contactUserId
        );

    if (!$contato) {
        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Você não possui permissão para iniciar conversa com este contato.'
            ],
            403
        );
    }

    $usuarioId =
        (int) $usuario['id'];

    $pdo->beginTransaction();

    $stmt =
        $pdo->prepare(
            "
                SELECT
                    c.id

                FROM conversas c

                INNER JOIN conversa_participantes a
                    ON a.conversa_id = c.id
                   AND a.usuario_id =
                       :usuario_id
                   AND a.ativo = 1
                   AND a.saiu_em IS NULL

                INNER JOIN conversa_participantes b
                    ON b.conversa_id = c.id
                   AND b.usuario_id =
                       :contato_id
                   AND b.ativo = 1
                   AND b.saiu_em IS NULL

                WHERE c.tipo =
                    'individual'

                  AND c.ativo = 1

                  AND (
                        SELECT COUNT(*)

                        FROM conversa_participantes cp

                        WHERE cp.conversa_id =
                            c.id

                          AND cp.ativo = 1
                          AND cp.saiu_em IS NULL
                      ) = 2

                LIMIT 1

                FOR UPDATE
            "
        );

    $stmt->execute([
        ':usuario_id' =>
            $usuarioId,

        ':contato_id' =>
            $contactUserId
    ]);

    $existing =
        $stmt->fetch();

    if ($existing) {

        $conversationId =
            (int) $existing['id'];

        $pdo->commit();

        primewayResponderJson([
            'success' => true,
            'conversationId' =>
                $conversationId,
            'created' =>
                false
        ]);
    }

    $stmtConversation =
        $pdo->prepare(
            "
                INSERT INTO conversas (
                    tipo,
                    criada_por_usuario_id,
                    ativo
                )
                VALUES (
                    'individual',
                    :usuario_id,
                    1
                )
            "
        );

    $stmtConversation->execute([
        ':usuario_id' =>
            $usuarioId
    ]);

    $conversationId =
        (int) $pdo->lastInsertId();

    $stmtParticipant =
        $pdo->prepare(
            "
                INSERT INTO conversa_participantes (
                    conversa_id,
                    usuario_id,
                    ativo,
                    entrou_em
                )
                VALUES (
                    :conversa_id,
                    :usuario_id,
                    1,
                    CURRENT_TIMESTAMP
                )
            "
        );

    foreach (
        [
            $usuarioId,
            $contactUserId
        ]
        as $participantId
    ) {
        $stmtParticipant->execute([
            ':conversa_id' =>
                $conversationId,

            ':usuario_id' =>
                $participantId
        ]);
    }

    $pdo->commit();

    primewayResponderJson(
        [
            'success' => true,
            'conversationId' =>
                $conversationId,
            'created' =>
                true
        ],
        201
    );

} catch (Throwable $erro) {

    if (
        isset($pdo) &&
        $pdo instanceof PDO &&
        $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }

    error_log(
        'PrimeWay Responsável Chat Iniciar POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível iniciar a conversa.'
        ],
        500
    );
}

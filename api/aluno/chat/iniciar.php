<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';
require_once __DIR__ . '/_chat.php';

primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'aluno'
    ]);

primewayExigirCsrf();

$dados =
    primewayLerJson();

$contatoUsuarioId =
    primewayIdPositivo(
        $dados['contactUserId']
        ?? null
    );

if ($contatoUsuarioId === null) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Contato inválido.'
        ],
        422
    );
}

if (
    $contatoUsuarioId ===
    (int) $usuario['id']
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não é possível iniciar uma conversa consigo mesmo.'
        ],
        422
    );
}

try {

    $pdo =
        primewayPdo();

    $contexto =
        primewayAlunoContexto(
            $pdo,
            $usuario
        );

    $turmaId =
        (int) (
            $contexto['enrollment']['classId']
            ?? 0
        );

    $contato =
        primewayAlunoChatContatoPermitido(
            $pdo,
            $turmaId,
            $contatoUsuarioId
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

    $stmtExistente =
        $pdo->prepare(
            "
                SELECT
                    c.id

                FROM conversas c

                INNER JOIN conversa_participantes eu
                    ON eu.conversa_id = c.id
                   AND eu.usuario_id = :usuario_id
                   AND eu.ativo = 1
                   AND eu.saiu_em IS NULL

                INNER JOIN conversa_participantes outro
                    ON outro.conversa_id = c.id
                   AND outro.usuario_id = :contato_id
                   AND outro.ativo = 1
                   AND outro.saiu_em IS NULL

                WHERE c.tipo = 'individual'
                  AND c.ativo = 1

                  AND (
                        SELECT COUNT(*)

                        FROM conversa_participantes cp

                        WHERE cp.conversa_id = c.id
                          AND cp.ativo = 1
                          AND cp.saiu_em IS NULL
                      ) = 2

                LIMIT 1

                FOR UPDATE
            "
        );

    $stmtExistente->execute([
        ':usuario_id' =>
            $usuarioId,

        ':contato_id' =>
            $contatoUsuarioId
    ]);

    $existente =
        $stmtExistente->fetch();

    if ($existente) {

        $conversaId =
            (int) $existente['id'];

        $pdo->commit();

        primewayResponderJson([
            'success' => true,
            'conversationId' =>
                $conversaId,
            'created' =>
                false
        ]);
    }

    $stmtConversa =
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

    $stmtConversa->execute([
        ':usuario_id' =>
            $usuarioId
    ]);

    $conversaId =
        (int) $pdo->lastInsertId();

    $stmtParticipante =
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

    $stmtParticipante->execute([
        ':conversa_id' =>
            $conversaId,

        ':usuario_id' =>
            $usuarioId
    ]);

    $stmtParticipante->execute([
        ':conversa_id' =>
            $conversaId,

        ':usuario_id' =>
            $contatoUsuarioId
    ]);

    $pdo->commit();

    primewayResponderJson(
        [
            'success' => true,
            'conversationId' =>
                $conversaId,
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
        'PrimeWay Aluno Chat Iniciar POST: ' .
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

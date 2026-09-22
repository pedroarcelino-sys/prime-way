<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_chat.php';

primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'professor'
    ]);

primewayExigirCsrf();

$dados =
    primewayLerJson();

$conversaId =
    primewayIdPositivo(
        $dados['conversationId']
        ?? null
    );

$conteudo =
    is_string(
        $dados['content']
        ?? null
    )
        ? trim(
            $dados['content']
        )
        : '';

if ($conversaId === null) {
    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Conversa inválida.'
        ],
        422
    );
}

if ($conteudo === '') {
    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Digite uma mensagem.'
        ],
        422
    );
}

if (mb_strlen($conteudo) > 5000) {
    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'A mensagem deve possuir no máximo 5000 caracteres.'
        ],
        422
    );
}

try {

    $pdo =
        primewayPdo();

    $usuarioId =
        (int) $usuario['id'];

    $conversa =
        primewayProfessorChatConversa(
            $pdo,
            $usuarioId,
            $conversaId
        );

    if (!$conversa) {
        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Conversa não encontrada.'
            ],
            404
        );
    }

    $pdo->beginTransaction();

    $stmt =
        $pdo->prepare(
            "
                INSERT INTO mensagens (
                    conversa_id,
                    remetente_usuario_id,
                    tipo,
                    conteudo,
                    enviada_em
                )
                VALUES (
                    :conversa_id,
                    :usuario_id,
                    'texto',
                    :conteudo,
                    CURRENT_TIMESTAMP
                )
            "
        );

    $stmt->execute([
        ':conversa_id' =>
            $conversaId,

        ':usuario_id' =>
            $usuarioId,

        ':conteudo' =>
            $conteudo
    ]);

    $messageId =
        (int) $pdo->lastInsertId();

    $stmtConversa =
        $pdo->prepare(
            "
                UPDATE conversas

                SET atualizado_em =
                    CURRENT_TIMESTAMP

                WHERE id =
                    :conversa_id
            "
        );

    $stmtConversa->execute([
        ':conversa_id' =>
            $conversaId
    ]);

    $stmtLeitura =
        $pdo->prepare(
            "
                INSERT IGNORE INTO mensagem_leituras (
                    mensagem_id,
                    usuario_id,
                    lida_em
                )
                VALUES (
                    :mensagem_id,
                    :usuario_id,
                    CURRENT_TIMESTAMP
                )
            "
        );

    $stmtLeitura->execute([
        ':mensagem_id' =>
            $messageId,

        ':usuario_id' =>
            $usuarioId
    ]);

    $pdo->commit();

    primewayResponderJson(
        [
            'success' => true,
            'messageId' =>
                $messageId
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
        'PrimeWay Professor Chat Enviar POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível enviar a mensagem.'
        ],
        500
    );
}

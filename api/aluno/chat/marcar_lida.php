<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_chat.php';

primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'aluno'
    ]);

primewayExigirCsrf();

$dados =
    primewayLerJson();

$conversaId =
    primewayIdPositivo(
        $dados['conversationId']
        ?? null
    );

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

try {

    $pdo =
        primewayPdo();

    $usuarioId =
        (int) $usuario['id'];

    $conversa =
        primewayAlunoChatConversa(
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
                INSERT IGNORE INTO mensagem_leituras (
                    mensagem_id,
                    usuario_id,
                    lida_em
                )

                SELECT
                    m.id,
                    :usuario_id_insert,
                    CURRENT_TIMESTAMP

                FROM mensagens m

                WHERE m.conversa_id =
                    :conversa_id

                  AND m.excluida_em IS NULL

                  AND m.remetente_usuario_id <>
                    :usuario_id_remetente
            "
        );

    $stmt->execute([
        ':usuario_id_insert' =>
            $usuarioId,

        ':conversa_id' =>
            $conversaId,

        ':usuario_id_remetente' =>
            $usuarioId
    ]);

    $stmtVisualizacao =
        $pdo->prepare(
            "
                UPDATE conversa_participantes

                SET ultima_visualizacao_em =
                    CURRENT_TIMESTAMP

                WHERE conversa_id =
                    :conversa_id

                  AND usuario_id =
                    :usuario_id
            "
        );

    $stmtVisualizacao->execute([
        ':conversa_id' =>
            $conversaId,

        ':usuario_id' =>
            $usuarioId
    ]);

    $pdo->commit();

    primewayResponderJson([
        'success' => true
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
        'PrimeWay Aluno Chat Leitura POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível atualizar a leitura das mensagens.'
        ],
        500
    );
}

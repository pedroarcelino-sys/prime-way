<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/../_chat_access.php';

primewayExigirMetodo('POST');

$usuario = primewayExigirPerfis([
    'aluno',
    'professor',
    'responsavel',
    'secretaria',
    'admin'
]);

primewayExigirCsrf();

$dados = primewayLerJson();
$mensagemId = primewayIdPositivo($dados['messageId'] ?? null);
$acao = isset($dados['action']) && is_string($dados['action'])
    ? trim(strtolower($dados['action']))
    : '';

if ($mensagemId === null) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Mensagem inválida.'
    ], 422);
}

if (!in_array($acao, ['pin', 'unpin', 'delete'], true)) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Ação de mensagem inválida.'
    ], 422);
}

try {
    $pdo = primewayPdo();
    $usuarioId = (int) $usuario['id'];

    primewayChatExigirDisponivel($pdo, $usuarioId);

    $stmt = $pdo->prepare(
        "
            SELECT
                m.id,
                m.conversa_id,
                m.remetente_usuario_id,
                m.excluida_em,
                m.fixada_em
            FROM mensagens m
            INNER JOIN conversas c
                ON c.id = m.conversa_id
               AND c.ativo = 1
            INNER JOIN conversa_participantes cp
                ON cp.conversa_id = m.conversa_id
               AND cp.usuario_id = :usuario_id
               AND cp.ativo = 1
               AND cp.saiu_em IS NULL
            WHERE m.id = :mensagem_id
            LIMIT 1
        "
    );

    $stmt->execute([
        ':usuario_id' => $usuarioId,
        ':mensagem_id' => $mensagemId
    ]);

    $mensagem = $stmt->fetch();

    if (!$mensagem) {
        primewayResponderJson([
            'success' => false,
            'message' => 'Mensagem não encontrada ou acesso não permitido.'
        ], 404);
    }

    if ($acao === 'delete') {
        if ((int) $mensagem['remetente_usuario_id'] !== $usuarioId) {
            primewayResponderJson([
                'success' => false,
                'message' => 'Você só pode excluir mensagens enviadas por você.'
            ], 403);
        }

        if ($mensagem['excluida_em'] !== null) {
            primewayResponderJson([
                'success' => true,
                'deleted' => true,
                'message' => 'Mensagem já estava excluída.'
            ]);
        }

        $pdo->beginTransaction();

        $pdo->prepare(
            "
                UPDATE mensagens
                SET
                    excluida_em = CURRENT_TIMESTAMP,
                    excluida_por_usuario_id = :usuario_id,
                    fixada_em = NULL,
                    fixada_por_usuario_id = NULL
                WHERE id = :mensagem_id
                  AND excluida_em IS NULL
            "
        )->execute([
            ':usuario_id' => $usuarioId,
            ':mensagem_id' => $mensagemId
        ]);

        $pdo->prepare(
            "
                UPDATE conversas
                SET atualizado_em = CURRENT_TIMESTAMP
                WHERE id = :conversa_id
            "
        )->execute([
            ':conversa_id' => (int) $mensagem['conversa_id']
        ]);

        $pdo->commit();

        primewayResponderJson([
            'success' => true,
            'deleted' => true,
            'message' => 'Mensagem excluída.'
        ]);
    }

    if ($mensagem['excluida_em'] !== null) {
        primewayResponderJson([
            'success' => false,
            'message' => 'Não é possível alterar uma mensagem excluída.'
        ], 409);
    }

    if ($acao === 'pin') {
        $pdo->prepare(
            "
                UPDATE mensagens
                SET
                    fixada_em = CURRENT_TIMESTAMP,
                    fixada_por_usuario_id = :usuario_id
                WHERE id = :mensagem_id
                  AND excluida_em IS NULL
            "
        )->execute([
            ':usuario_id' => $usuarioId,
            ':mensagem_id' => $mensagemId
        ]);

        primewayResponderJson([
            'success' => true,
            'pinned' => true,
            'message' => 'Mensagem fixada.'
        ]);
    }

    $pdo->prepare(
        "
            UPDATE mensagens
            SET
                fixada_em = NULL,
                fixada_por_usuario_id = NULL
            WHERE id = :mensagem_id
              AND excluida_em IS NULL
        "
    )->execute([
        ':mensagem_id' => $mensagemId
    ]);

    primewayResponderJson([
        'success' => true,
        'pinned' => false,
        'message' => 'Mensagem desafixada.'
    ]);

} catch (Throwable $erro) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('PrimeWay Chat Ação de Mensagem POST: ' . $erro->getMessage());

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível concluir a ação da mensagem.'
    ], 500);
}

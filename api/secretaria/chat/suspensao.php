<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('POST');

$usuario = primewayExigirPerfis([
    'secretaria'
]);

primewayExigirCsrf();

$dados = primewayLerJson();

$targetUserId = primewayIdPositivo(
    $dados['userId'] ?? null
);

$suspended = filter_var(
    $dados['suspended'] ?? null,
    FILTER_VALIDATE_BOOLEAN,
    FILTER_NULL_ON_FAILURE
);

$reason = is_string($dados['reason'] ?? null)
    ? trim((string) $dados['reason'])
    : '';

if ($targetUserId === null || $suspended === null) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Dados de suspensão inválidos.'
    ], 422);
}

if ($targetUserId === (int) $usuario['id']) {
    primewayResponderJson([
        'success' => false,
        'message' => 'A Secretaria não pode suspender o próprio chat.'
    ], 422);
}

if (mb_strlen($reason) > 255) {
    primewayResponderJson([
        'success' => false,
        'message' => 'O motivo deve possuir no máximo 255 caracteres.'
    ], 422);
}

try {
    $pdo = primewayPdo();

    $stmtTarget = $pdo->prepare(
        "
            SELECT
                u.id,
                u.perfil,
                u.chat_suspenso,
                COALESCE(pe.nome, u.nome, u.email) AS nome
            FROM usuarios u
            LEFT JOIN pessoas pe
                ON pe.id = u.pessoa_id
            WHERE u.id = :usuario_id
              AND u.ativo = 1
              AND u.perfil IN (
                    'admin',
                    'professor',
                    'responsavel',
                    'aluno'
              )
            LIMIT 1
        "
    );

    $stmtTarget->execute([
        ':usuario_id' => $targetUserId
    ]);

    $target = $stmtTarget->fetch();

    if (!$target) {
        primewayResponderJson([
            'success' => false,
            'message' => 'Usuário não encontrado ou não pode ser administrado pelo chat.'
        ], 404);
    }

    if ($suspended) {
        $stmt = $pdo->prepare(
            "
                UPDATE usuarios
                SET
                    chat_suspenso = 1,
                    chat_suspenso_em = CURRENT_TIMESTAMP,
                    chat_suspenso_por_usuario_id = :secretaria_id,
                    chat_suspensao_motivo = :motivo
                WHERE id = :usuario_id
            "
        );

        $stmt->execute([
            ':secretaria_id' => (int) $usuario['id'],
            ':motivo' => $reason !== '' ? $reason : null,
            ':usuario_id' => $targetUserId
        ]);
    } else {
        $stmt = $pdo->prepare(
            "
                UPDATE usuarios
                SET
                    chat_suspenso = 0,
                    chat_suspenso_em = NULL,
                    chat_suspenso_por_usuario_id = NULL,
                    chat_suspensao_motivo = NULL
                WHERE id = :usuario_id
            "
        );

        $stmt->execute([
            ':usuario_id' => $targetUserId
        ]);
    }

    primewayResponderJson([
        'success' => true,
        'userId' => $targetUserId,
        'name' => (string) $target['nome'],
        'suspended' => $suspended,
        'reason' => $suspended && $reason !== '' ? $reason : null,
        'message' => $suspended
            ? 'Chat do usuário suspenso com sucesso.'
            : 'Chat do usuário reativado com sucesso.'
    ]);

} catch (Throwable $erro) {
    error_log(
        'PrimeWay Secretaria Chat Suspensão POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível alterar a suspensão do chat.'
    ], 500);
}

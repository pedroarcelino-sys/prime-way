<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/../_chat_access.php';
require_once __DIR__ . '/_attachments.php';

primewayExigirMetodo('POST');

$usuario = primewayExigirPerfis([
    'aluno',
    'professor',
    'responsavel',
    'secretaria',
    'admin'
]);

primewayExigirCsrf();

$conversaId = primewayIdPositivo(
    $_POST['conversationId'] ?? null
);

$conteudo = isset($_POST['content']) && is_string($_POST['content'])
    ? trim($_POST['content'])
    : '';

if ($conversaId === null) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Conversa inválida.'
    ], 422);
}

if (mb_strlen($conteudo) > 5000) {
    primewayResponderJson([
        'success' => false,
        'message' => 'A mensagem deve possuir no máximo 5000 caracteres.'
    ], 422);
}

if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Selecione um arquivo para enviar.'
    ], 422);
}

$savedPath = null;

try {
    $pdo = primewayPdo();
    $usuarioId = (int) $usuario['id'];

    primewayChatExigirDisponivel(
        $pdo,
        $usuarioId
    );

    $stmtConversation = $pdo->prepare(
        "
            SELECT c.id
            FROM conversas c
            INNER JOIN conversa_participantes cp
                ON cp.conversa_id = c.id
               AND cp.usuario_id = :usuario_id
               AND cp.ativo = 1
               AND cp.saiu_em IS NULL
            WHERE c.id = :conversa_id
              AND c.ativo = 1
            LIMIT 1
        "
    );

    $stmtConversation->execute([
        ':usuario_id' => $usuarioId,
        ':conversa_id' => $conversaId
    ]);

    if (!$stmtConversation->fetch()) {
        primewayResponderJson([
            'success' => false,
            'message' => 'Conversa não encontrada ou acesso não permitido.'
        ], 404);
    }

    $upload = primewayChatValidateUpload($_FILES['file']);

    $relativeDirectory = date('Y/m');
    $directory = primewayChatEnsureStorageDirectory($relativeDirectory);
    $generatedName = bin2hex(random_bytes(24)) . '.' . $upload['extension'];
    $savedPath = $directory . DIRECTORY_SEPARATOR . $generatedName;

    if (!move_uploaded_file($upload['temporaryPath'], $savedPath)) {
        throw new RuntimeException('Não foi possível armazenar o arquivo enviado.');
    }

    $relativePath = $relativeDirectory . '/' . $generatedName;
    $messageType = $conteudo !== ''
        ? 'misto'
        : ($upload['kind'] === 'audio' ? 'audio' : 'arquivo');

    $pdo->beginTransaction();

    $stmtMessage = $pdo->prepare(
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
                :tipo,
                :conteudo,
                CURRENT_TIMESTAMP
            )
        "
    );

    $stmtMessage->execute([
        ':conversa_id' => $conversaId,
        ':usuario_id' => $usuarioId,
        ':tipo' => $messageType,
        ':conteudo' => $conteudo !== '' ? $conteudo : null
    ]);

    $messageId = (int) $pdo->lastInsertId();

    $stmtAttachment = $pdo->prepare(
        "
            INSERT INTO mensagem_anexos (
                mensagem_id,
                nome_original,
                nome_arquivo,
                mime_type,
                tamanho_bytes,
                caminho
            )
            VALUES (
                :mensagem_id,
                :nome_original,
                :nome_arquivo,
                :mime_type,
                :tamanho_bytes,
                :caminho
            )
        "
    );

    $stmtAttachment->execute([
        ':mensagem_id' => $messageId,
        ':nome_original' => $upload['originalName'],
        ':nome_arquivo' => $generatedName,
        ':mime_type' => $upload['mimeType'],
        ':tamanho_bytes' => $upload['size'],
        ':caminho' => $relativePath
    ]);

    $pdo->prepare(
        "
            UPDATE conversas
            SET atualizado_em = CURRENT_TIMESTAMP
            WHERE id = :conversa_id
        "
    )->execute([
        ':conversa_id' => $conversaId
    ]);

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
    )->execute([
        ':mensagem_id' => $messageId,
        ':usuario_id' => $usuarioId
    ]);

    $pdo->commit();

    primewayResponderJson([
        'success' => true,
        'messageId' => $messageId,
        'type' => $messageType,
        'message' => $messageType === 'audio'
            ? 'Áudio enviado com sucesso.'
            : 'Arquivo enviado com sucesso.'
    ], 201);

} catch (RuntimeException $erro) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if (is_string($savedPath) && is_file($savedPath)) {
        @unlink($savedPath);
    }

    primewayResponderJson([
        'success' => false,
        'message' => $erro->getMessage()
    ], 422);

} catch (Throwable $erro) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if (is_string($savedPath) && is_file($savedPath)) {
        @unlink($savedPath);
    }

    error_log(
        'PrimeWay Chat Upload POST: ' . $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível enviar o arquivo.'
    ], 500);
}

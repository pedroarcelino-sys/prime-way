<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/_attachments.php';

primewayExigirMetodo('GET');

$usuario = primewayExigirAutenticacao();

$attachmentId = primewayIdPositivo(
    $_GET['attachmentId'] ?? null
);

if ($attachmentId === null) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Anexo inválido.'
    ], 422);
}

try {
    $pdo = primewayPdo();

    $stmt = $pdo->prepare(
        "
            SELECT
                a.id,
                a.nome_original,
                a.mime_type,
                a.tamanho_bytes,
                a.caminho
            FROM mensagem_anexos a
            INNER JOIN mensagens m
                ON m.id = a.mensagem_id
               AND m.excluida_em IS NULL
            INNER JOIN conversa_participantes cp
                ON cp.conversa_id = m.conversa_id
               AND cp.usuario_id = :usuario_id
               AND cp.ativo = 1
               AND cp.saiu_em IS NULL
            WHERE a.id = :anexo_id
            LIMIT 1
        "
    );

    $stmt->execute([
        ':usuario_id' => (int) $usuario['id'],
        ':anexo_id' => $attachmentId
    ]);

    $attachment = $stmt->fetch();

    if (!$attachment) {
        primewayResponderJson([
            'success' => false,
            'message' => 'Anexo não encontrado ou acesso não permitido.'
        ], 404);
    }

    $root = realpath(primewayChatStorageRoot());

    if ($root === false) {
        primewayResponderJson([
            'success' => false,
            'message' => 'Arquivo indisponível.'
        ], 404);
    }

    $candidate = realpath(
        $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, (string) $attachment['caminho'])
    );

    $rootPrefix = rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;

    if (
        $candidate === false ||
        !is_file($candidate) ||
        !str_starts_with($candidate, $rootPrefix)
    ) {
        primewayResponderJson([
            'success' => false,
            'message' => 'Arquivo indisponível.'
        ], 404);
    }

    $mimeType = trim((string) ($attachment['mime_type'] ?? ''));

    if ($mimeType === '') {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = (string) $finfo->file($candidate);
    }

    $download = isset($_GET['download']) && (string) $_GET['download'] === '1';
    $inlineAllowed = str_starts_with($mimeType, 'image/') || $mimeType === 'application/pdf' || $mimeType === 'text/plain';
    $disposition = (!$download && $inlineAllowed) ? 'inline' : 'attachment';

    $filename = (string) $attachment['nome_original'];
    $fallbackName = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename) ?: 'arquivo';

    header_remove('Content-Type');
    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . (string) filesize($candidate));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store, max-age=0');
    header(
        "Content-Disposition: {$disposition}; filename=\"{$fallbackName}\"; filename*=UTF-8''" . rawurlencode($filename)
    );

    readfile($candidate);
    exit;

} catch (Throwable $erro) {
    error_log(
        'PrimeWay Chat Arquivo GET: ' . $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível abrir o arquivo.'
    ], 500);
}

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

    // Alguns ambientes Windows identificam WebM/OGG gravado pelo navegador
    // como vídeo/aplicação mesmo quando o conteúdo é somente áudio.
    if ($mimeType === 'video/webm') {
        $mimeType = 'audio/webm';
    } elseif ($mimeType === 'application/ogg') {
        $mimeType = 'audio/ogg';
    }

    $download = isset($_GET['download']) && (string) $_GET['download'] === '1';
    $inlineAllowed = str_starts_with($mimeType, 'image/')
        || str_starts_with($mimeType, 'audio/')
        || in_array($mimeType, ['application/pdf', 'text/plain'], true);
    $disposition = (!$download && $inlineAllowed) ? 'inline' : 'attachment';

    $filename = (string) $attachment['nome_original'];
    $fallbackName = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename) ?: 'arquivo';
    $fileSize = (int) filesize($candidate);

    if ($fileSize <= 0) {
        primewayResponderJson([
            'success' => false,
            'message' => 'Arquivo indisponível.'
        ], 404);
    }

    $start = 0;
    $end = $fileSize - 1;
    $isPartial = false;
    $rangeHeader = trim((string) ($_SERVER['HTTP_RANGE'] ?? ''));

    if ($rangeHeader !== '') {
        if (!preg_match('/^bytes=(\d*)-(\d*)$/', $rangeHeader, $matches)) {
            http_response_code(416);
            header("Content-Range: bytes */{$fileSize}");
            exit;
        }

        $rangeStart = $matches[1];
        $rangeEnd = $matches[2];

        if ($rangeStart === '' && $rangeEnd === '') {
            http_response_code(416);
            header("Content-Range: bytes */{$fileSize}");
            exit;
        }

        if ($rangeStart === '') {
            $suffixLength = (int) $rangeEnd;

            if ($suffixLength <= 0) {
                http_response_code(416);
                header("Content-Range: bytes */{$fileSize}");
                exit;
            }

            $suffixLength = min($suffixLength, $fileSize);
            $start = $fileSize - $suffixLength;
            $end = $fileSize - 1;
        } else {
            $start = (int) $rangeStart;
            $end = $rangeEnd === ''
                ? $fileSize - 1
                : min((int) $rangeEnd, $fileSize - 1);
        }

        if ($start < 0 || $start >= $fileSize || $end < $start) {
            http_response_code(416);
            header("Content-Range: bytes */{$fileSize}");
            exit;
        }

        $isPartial = true;
    }

    $length = ($end - $start) + 1;

    header_remove('Content-Type');
    header('Content-Type: ' . $mimeType);
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store, max-age=0');
    header('Accept-Ranges: bytes');
    header(
        "Content-Disposition: {$disposition}; filename=\"{$fallbackName}\"; filename*=UTF-8''" . rawurlencode($filename)
    );

    if ($isPartial) {
        http_response_code(206);
        header("Content-Range: bytes {$start}-{$end}/{$fileSize}");
    }

    header('Content-Length: ' . (string) $length);

    // Libera a sessão antes de transmitir o arquivo para não bloquear
    // polling e outras requisições do Chat durante a reprodução.
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    $handle = fopen($candidate, 'rb');

    if ($handle === false) {
        throw new RuntimeException('Não foi possível abrir o arquivo armazenado.');
    }

    if ($start > 0) {
        fseek($handle, $start);
    }

    $remaining = $length;
    $chunkSize = 64 * 1024;

    while ($remaining > 0 && !feof($handle)) {
        $readLength = min($chunkSize, $remaining);
        $buffer = fread($handle, $readLength);

        if ($buffer === false || $buffer === '') {
            break;
        }

        echo $buffer;
        $remaining -= strlen($buffer);

        if (function_exists('fastcgi_finish_request')) {
            // Não chamar fastcgi_finish_request aqui: ele encerraria a resposta.
        }

        flush();
    }

    fclose($handle);
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

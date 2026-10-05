<?php

declare(strict_types=1);

function primewayChatStorageRoot(): string
{
    $configured = getenv('PRIMEWAY_STORAGE_DIR');

    if (is_string($configured) && trim($configured) !== '') {
        $base = rtrim(trim($configured), "\\/");
    } else {
        $localAppData = getenv('LOCALAPPDATA');
        $userProfile = getenv('USERPROFILE');

        if (is_string($localAppData) && trim($localAppData) !== '') {
            $base = rtrim(trim($localAppData), "\\/") . DIRECTORY_SEPARATOR . 'PrimeWay' . DIRECTORY_SEPARATOR . 'storage';
        } elseif (is_string($userProfile) && trim($userProfile) !== '') {
            $base = rtrim(trim($userProfile), "\\/") . DIRECTORY_SEPARATOR . 'PrimeWayStorage';
        } else {
            $base = rtrim(sys_get_temp_dir(), "\\/") . DIRECTORY_SEPARATOR . 'primeway-storage';
        }
    }

    return $base . DIRECTORY_SEPARATOR . 'chat';
}

function primewayChatEnsureStorageDirectory(string $relativeDirectory): string
{
    $root = primewayChatStorageRoot();
    $path = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativeDirectory);

    if (!is_dir($path) && !mkdir($path, 0770, true) && !is_dir($path)) {
        throw new RuntimeException('Não foi possível preparar o armazenamento do chat.');
    }

    return $path;
}

function primewayChatAllowedExtensions(): array
{
    return [
        'pdf', 'png', 'jpg', 'jpeg', 'txt',
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'webm', 'ogg', 'mp3', 'm4a', 'wav'
    ];
}

function primewayChatAllowedMimeTypes(): array
{
    return [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip',
        'audio/webm',
        'video/webm',
        'audio/ogg',
        'application/ogg',
        'audio/mpeg',
        'audio/mp4',
        'video/mp4',
        'audio/x-m4a',
        'audio/wav',
        'audio/x-wav',
        'audio/vnd.wave'
    ];
}

function primewayChatValidateUpload(array $file): array
{
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($error !== UPLOAD_ERR_OK) {
        $message = match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'O arquivo excede o limite permitido pelo servidor.',
            UPLOAD_ERR_PARTIAL => 'O envio do arquivo foi interrompido.',
            UPLOAD_ERR_NO_FILE => 'Selecione um arquivo para enviar.',
            default => 'Não foi possível receber o arquivo enviado.'
        };
        throw new RuntimeException($message);
    }

    $temporaryPath = (string) ($file['tmp_name'] ?? '');
    $originalName = trim((string) ($file['name'] ?? ''));
    $clientMimeType = strtolower(trim((string) ($file['type'] ?? '')));
    $size = (int) ($file['size'] ?? 0);

    if ($temporaryPath === '' || !is_uploaded_file($temporaryPath)) {
        throw new RuntimeException('Arquivo enviado inválido.');
    }
    if ($size <= 0) {
        throw new RuntimeException('O arquivo está vazio.');
    }
    if ($size > 10 * 1024 * 1024) {
        throw new RuntimeException('O arquivo deve possuir no máximo 10 MB.');
    }

    $extension = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));
    if (!in_array($extension, primewayChatAllowedExtensions(), true)) {
        throw new RuntimeException('Formato de arquivo não permitido no chat.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = strtolower((string) $finfo->file($temporaryPath));

    if ($extension === 'webm' && $mimeType === 'video/webm' && str_starts_with($clientMimeType, 'audio/webm')) {
        $mimeType = 'audio/webm';
    }
    if ($extension === 'ogg' && $mimeType === 'application/ogg' && str_starts_with($clientMimeType, 'audio/ogg')) {
        $mimeType = 'audio/ogg';
    }
    if ($extension === 'm4a' && $mimeType === 'video/mp4' && str_starts_with($clientMimeType, 'audio/')) {
        $mimeType = 'audio/mp4';
    }

    if (!in_array($mimeType, primewayChatAllowedMimeTypes(), true)) {
        throw new RuntimeException('O tipo real do arquivo não é permitido no chat.');
    }

    if ($mimeType === 'application/zip' && !in_array($extension, ['docx', 'xlsx', 'pptx'], true)) {
        throw new RuntimeException('Arquivos ZIP não são permitidos no chat.');
    }

    $audioExtensions = ['webm', 'ogg', 'mp3', 'm4a', 'wav'];
    $isAudio = in_array($extension, $audioExtensions, true)
        && (
            str_starts_with($mimeType, 'audio/')
            || in_array($mimeType, ['video/webm', 'application/ogg'], true)
        );

    if (in_array($extension, $audioExtensions, true) && !$isAudio) {
        throw new RuntimeException('O arquivo selecionado não é um áudio válido.');
    }

    $safeOriginalName = preg_replace('/[^\pL\pN._()\- ]+/u', '_', $originalName);
    $safeOriginalName = trim((string) $safeOriginalName);
    if ($safeOriginalName === '') {
        $safeOriginalName = 'arquivo.' . $extension;
    }

    return [
        'temporaryPath' => $temporaryPath,
        'originalName' => mb_substr($safeOriginalName, 0, 255),
        'extension' => $extension,
        'mimeType' => $mimeType,
        'size' => $size,
        'kind' => $isAudio ? 'audio' : primewayChatAttachmentKind($mimeType)
    ];
}

function primewayChatAttachmentKind(string $mimeType): string
{
    if (str_starts_with($mimeType, 'image/')) {
        return 'image';
    }
    if ($mimeType === 'application/pdf') {
        return 'pdf';
    }
    if (
        str_starts_with($mimeType, 'audio/')
        || in_array($mimeType, ['video/webm', 'application/ogg'], true)
    ) {
        return 'audio';
    }
    return 'document';
}

<?php

declare(strict_types=1);

function primewayChatStorageRoot(): string
{
    $configured = getenv('PRIMEWAY_STORAGE_DIR');

    $base = is_string($configured) && trim($configured) !== ''
        ? rtrim(trim($configured), "\\/")
        : dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'primeway-storage';

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
        'pdf',
        'png',
        'jpg',
        'jpeg',
        'txt',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx'
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
        'application/zip'
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
    $mimeType = (string) $finfo->file($temporaryPath);

    if (!in_array($mimeType, primewayChatAllowedMimeTypes(), true)) {
        throw new RuntimeException('O tipo real do arquivo não é permitido no chat.');
    }

    if ($mimeType === 'application/zip' && !in_array($extension, ['docx', 'xlsx', 'pptx'], true)) {
        throw new RuntimeException('Arquivos ZIP não são permitidos no chat.');
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
        'size' => $size
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

    return 'document';
}

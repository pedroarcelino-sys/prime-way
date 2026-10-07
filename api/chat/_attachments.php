<?php

declare(strict_types=1);

require_once __DIR__ . '/../../config/storage.php';

final class PrimewayChatUploadValidationError extends RuntimeException {}

function primewayChatStorageRoot(): string
{
    $configured = primewayStorageBase();

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
    foreach (['error','tmp_name','name','type','size'] as $key) {
        if (isset($file[$key]) && !is_scalar($file[$key])) {
            throw new PrimewayChatUploadValidationError('Arquivo enviado inválido.');
        }
    }
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($error !== UPLOAD_ERR_OK) {
        $message = match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'O arquivo excede o limite permitido pelo servidor.',
            UPLOAD_ERR_PARTIAL => 'O envio do arquivo foi interrompido.',
            UPLOAD_ERR_NO_FILE => 'Selecione um arquivo para enviar.',
            default => 'Não foi possível receber o arquivo enviado.'
        };
        throw new PrimewayChatUploadValidationError($message);
    }

    $temporaryPath = (string) ($file['tmp_name'] ?? '');
    $originalName = basename(str_replace('\\', '/', trim((string) ($file['name'] ?? ''))));
    $clientMimeType = strtolower(trim((string) ($file['type'] ?? '')));
    $size = (int) ($file['size'] ?? 0);

    if ($temporaryPath === '' || !is_uploaded_file($temporaryPath)) {
        throw new PrimewayChatUploadValidationError('Arquivo enviado inválido.');
    }
    $size = (int)filesize($temporaryPath);
    if ($size <= 0) {
        throw new PrimewayChatUploadValidationError('O arquivo está vazio.');
    }
    if ($size > 10 * 1024 * 1024) {
        throw new PrimewayChatUploadValidationError('O arquivo deve possuir no máximo 10 MB.');
    }

    $extension = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));
    if (!in_array($extension, primewayChatAllowedExtensions(), true)) {
        throw new PrimewayChatUploadValidationError('Formato de arquivo não permitido no chat.');
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
        throw new PrimewayChatUploadValidationError('O tipo real do arquivo não é permitido no chat.');
    }

    if ($mimeType === 'application/zip' && !in_array($extension, ['docx', 'xlsx', 'pptx'], true)) {
        throw new PrimewayChatUploadValidationError('Arquivos ZIP não são permitidos no chat.');
    }

    primewayChatValidateContent($temporaryPath, $extension, $mimeType);

    $audioExtensions = ['webm', 'ogg', 'mp3', 'm4a', 'wav'];
    $isAudio = in_array($extension, $audioExtensions, true)
        && (
            str_starts_with($mimeType, 'audio/')
            || in_array($mimeType, ['video/webm', 'application/ogg'], true)
        );

    if (in_array($extension, $audioExtensions, true) && !$isAudio) {
        throw new PrimewayChatUploadValidationError('O arquivo selecionado não é um áudio válido.');
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

// MIME real deve corresponder à extensão; ZIP genérico não é documento Office.
function primewayChatValidateContent(string $path, string $extension, string $mime): void
{
    $office = [
        'docx'=>['application/vnd.openxmlformats-officedocument.wordprocessingml.document','word/document.xml'],
        'xlsx'=>['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xl/workbook.xml'],
        'pptx'=>['application/vnd.openxmlformats-officedocument.presentationml.presentation','ppt/presentation.xml']
    ];
    if (isset($office[$extension])) {
        if (!in_array($mime, [$office[$extension][0],'application/zip','application/octet-stream'], true)) {
            throw new PrimewayChatUploadValidationError('O conteúdo não corresponde ao documento informado.');
        }
        try {
            $archive = new PharData($path);
            $valid = $archive->isFileFormat(Phar::ZIP)
                && isset($archive['[Content_Types].xml'], $archive[$office[$extension][1]]);
            foreach (new RecursiveIteratorIterator($archive) as $entry) {
                if (strtolower($entry->getFilename()) === 'vbaproject.bin') $valid=false;
            }
        } catch (Throwable $error) {
            $valid=false;
        }
        if (!$valid) throw new PrimewayChatUploadValidationError('Documento Office inválido ou com macros não permitidas.');
        return;
    }
    $types = [
        'pdf'=>['application/pdf'], 'png'=>['image/png'], 'jpg'=>['image/jpeg'], 'jpeg'=>['image/jpeg'],
        'webp'=>['image/webp'], 'txt'=>['text/plain'],
        'doc'=>['application/msword'], 'xls'=>['application/vnd.ms-excel'], 'ppt'=>['application/vnd.ms-powerpoint'],
        'webm'=>['audio/webm','video/webm'], 'ogg'=>['audio/ogg','application/ogg'],
        'mp3'=>['audio/mpeg'], 'm4a'=>['audio/mp4','video/mp4','audio/x-m4a'],
        'wav'=>['audio/wav','audio/x-wav','audio/vnd.wave']
    ];
    if (in_array($extension, ['doc','xls','ppt'], true) && in_array($mime,['application/octet-stream','application/x-ole-storage'],true)) {
        $handle=fopen($path,'rb');$magic=$handle?fread($handle,8):'';if($handle)fclose($handle);
        if ($magic === hex2bin('d0cf11e0a1b11ae1')) return;
    }
    if (!in_array($mime, $types[$extension] ?? [], true)) {
        throw new PrimewayChatUploadValidationError('O conteúdo do arquivo não corresponde ao tipo informado.');
    }
}

function primewayChatAttachmentMessageType(string $kind, string $content): string
{
    if ($kind === 'audio') {
        if (trim($content) !== '') {
            throw new PrimewayChatUploadValidationError(
                'Envie o áudio separadamente, sem texto na mesma mensagem.'
            );
        }
        return 'audio';
    }

    return trim($content) !== '' ? 'misto' : 'arquivo';
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

<?php
declare(strict_types=1);
require_once __DIR__ . '/runtime.php';

function primewayStorageBase(): ?string
{
    $value = getenv('PRIMEWAY_STORAGE_DIR');
    if (!is_string($value) || trim($value) === '') {
        if (primewayProduction()) throw new RuntimeException('Armazenamento persistente não configurado.');
        return null;
    }
    $base = rtrim(trim($value), '\\/');
    if (!preg_match('~^(?:[A-Za-z]:[\\\\/]|/|\\\\\\\\)~', $base)) {
        throw new RuntimeException('O armazenamento deve usar caminho absoluto.');
    }
    // Impedir storage de produção dentro do checkout público (também por symlink).
    if (primewayProduction()) {
        $resolved = realpath($base);
        $project = realpath(dirname(__DIR__));
        if ($resolved === false || !is_dir($resolved) || !is_writable($resolved)) {
            throw new RuntimeException('Armazenamento persistente indisponível.');
        }
        $candidate = str_replace('\\', '/', $resolved);
        $public = str_replace('\\', '/', (string)$project);
        if (PHP_OS_FAMILY === 'Windows') {$candidate=strtolower($candidate);$public=strtolower($public);}
        if ($candidate === $public || str_starts_with($candidate, $public.'/')) {
            throw new RuntimeException('Armazenamento persistente deve estar fora da raiz pública.');
        }
        return $resolved;
    }
    return $base;
}

function primewayActivitiesStorageRoot(): string
{
    $base = primewayStorageBase();
    return ($base ?? dirname(__DIR__).DIRECTORY_SEPARATOR.'storage').DIRECTORY_SEPARATOR.'atividades';
}

<?php

declare(strict_types=1);

$raiz = dirname(__DIR__);
$diretorios = [
    $raiz . DIRECTORY_SEPARATOR . 'api',
    $raiz . DIRECTORY_SEPARATOR . 'config',
    $raiz . DIRECTORY_SEPARATOR . 'database',
    $raiz . DIRECTORY_SEPARATOR . 'tests'
];
$falhas = [];
$total = 0;

foreach ($diretorios as $diretorio) {
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator(
            $diretorio,
            FilesystemIterator::SKIP_DOTS
        )
    );

    foreach ($iterator as $arquivo) {
        if (
            !$arquivo->isFile() ||
            strtolower($arquivo->getExtension()) !== 'php' ||
            $arquivo->getFilename() === 'database.local.php'
        ) {
            continue;
        }

        $total++;
        $comando = sprintf(
            '%s -l %s',
            escapeshellarg(PHP_BINARY),
            escapeshellarg($arquivo->getPathname())
        );
        $saida = [];
        $codigo = 0;

        exec(
            $comando,
            $saida,
            $codigo
        );

        if ($codigo !== 0) {
            $falhas[] = implode(PHP_EOL, $saida);
        }
    }
}

if ($falhas !== []) {
    fwrite(
        STDERR,
        implode(PHP_EOL, $falhas) . PHP_EOL
    );
    exit(1);
}

echo sprintf(
    "PHP lint: %d arquivos válidos.%s",
    $total,
    PHP_EOL
);

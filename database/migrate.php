<?php

declare(strict_types=1);

if (
    PHP_SAPI !== 'cli'
) {
    http_response_code(404);
    exit;
}

require_once
    __DIR__ .
    '/../config/database.php';


function primewayArgumentoBaseline(
    array $argumentos
): ?int {
    foreach ($argumentos as $argumento) {
        if (
            preg_match(
                '/^--baseline=(\d+)$/',
                (string) $argumento,
                $resultado
            ) === 1
        ) {
            return (int) $resultado[1];
        }
    }

    return null;
}


function primewaySqlMigration(
    string $caminho
): string {
    $sql = file_get_contents($caminho);

    if ($sql === false) {
        throw new RuntimeException(
            'Não foi possível ler ' . $caminho
        );
    }

    /*
        A conexão já seleciona o banco configurado. Remover USE evita
        que uma migration desvie para um banco fixo com o mesmo nome.
    */
    $sql = preg_replace(
        '/^\s*USE\s+[`a-zA-Z0-9_]+\s*;\s*$/mi',
        '',
        $sql
    );

    if (!is_string($sql)) {
        throw new RuntimeException(
            'Falha ao preparar a migration.'
        );
    }

    return $sql;
}


function primewayMigrationPdo(): PDO
{
    $config =
        primewayDatabaseConfig();

    $arquivoLocal =
        __DIR__ .
        '/../config/database.migration.local.php';

    if (is_file($arquivoLocal)) {
        $configMigracao = require $arquivoLocal;

        if (!is_array($configMigracao)) {
            throw new RuntimeException(
                'database.migration.local.php deve retornar um array.'
            );
        }

        $config =
            array_merge(
                $config,
                $configMigracao
            );
    }

    $usuarioAmbiente =
        getenv('PRIMEWAY_MIGRATION_DB_USER');
    $senhaAmbiente =
        getenv('PRIMEWAY_MIGRATION_DB_PASS');

    if ($usuarioAmbiente !== false) {
        $config['user'] = $usuarioAmbiente;
    }

    if ($senhaAmbiente !== false) {
        $config['password'] = $senhaAmbiente;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['database']
    );

    return new PDO(
        $dsn,
        (string) $config['user'],
        (string) $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
}


try {
    $pdo = primewayMigrationPdo();

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS schema_migrations (
            versao VARCHAR(255) NOT NULL,
            checksum CHAR(64) NOT NULL,
            aplicado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (versao)
        ) ENGINE=InnoDB
          DEFAULT CHARSET=utf8mb4
          COLLATE=utf8mb4_unicode_ci'
    );

    $arquivos =
        glob(
            __DIR__ .
            '/migrations/*.sql'
        );

    if ($arquivos === false) {
        throw new RuntimeException(
            'Não foi possível listar as migrations.'
        );
    }

    sort(
        $arquivos,
        SORT_NATURAL
    );

    $aplicadas = [];
    $stmt =
        $pdo->query(
            'SELECT versao, checksum
             FROM schema_migrations'
        );

    foreach ($stmt->fetchAll() as $linha) {
        $aplicadas[
            (string) $linha['versao']
        ] = (string) $linha['checksum'];
    }

    $registrar =
        $pdo->prepare(
            'INSERT INTO schema_migrations (
                versao,
                checksum
             ) VALUES (
                :versao,
                :checksum
             )'
        );

    $baseline =
        primewayArgumentoBaseline(
            $argv
        );

    if ($baseline !== null) {
        foreach ($arquivos as $arquivo) {
            $versao = basename($arquivo);

            if (
                preg_match('/^(\d+)_/', $versao, $partes) !== 1 ||
                (int) $partes[1] > $baseline ||
                isset($aplicadas[$versao])
            ) {
                continue;
            }

            $checksum = hash_file('sha256', $arquivo);

            if (!is_string($checksum)) {
                throw new RuntimeException(
                    'Não foi possível calcular o checksum de ' . $versao
                );
            }

            $registrar->execute([
                ':versao' => $versao,
                ':checksum' => $checksum
            ]);

            $aplicadas[$versao] = $checksum;
            echo '[baseline] ' . $versao . PHP_EOL;
        }
    }

    $quantidade = 0;

    foreach ($arquivos as $arquivo) {
        $versao = basename($arquivo);
        $checksum = hash_file('sha256', $arquivo);

        if (!is_string($checksum)) {
            throw new RuntimeException(
                'Não foi possível calcular o checksum de ' . $versao
            );
        }

        if (isset($aplicadas[$versao])) {
            if (
                $aplicadas[$versao] !== 'baseline' &&
                !hash_equals(
                    $aplicadas[$versao],
                    $checksum
                )
            ) {
                throw new RuntimeException(
                    'A migration já aplicada foi modificada: ' . $versao
                );
            }

            echo '[ok] ' . $versao . PHP_EOL;
            continue;
        }

        echo '[aplicando] ' . $versao . PHP_EOL;

        $pdo->exec(
            primewaySqlMigration($arquivo)
        );

        $registrar->execute([
            ':versao' => $versao,
            ':checksum' => $checksum
        ]);

        $quantidade++;
        echo '[aplicada] ' . $versao . PHP_EOL;
    }

    echo sprintf(
        '%d migration(s) aplicada(s).%s',
        $quantidade,
        PHP_EOL
    );

} catch (Throwable $erro) {
    fwrite(
        STDERR,
        'Erro nas migrations: ' .
        $erro->getMessage() .
        PHP_EOL
    );
    exit(1);
}

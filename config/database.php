<?php

declare(strict_types=1);

require_once __DIR__ . '/runtime.php';

/*====================================================
        BANCO DE DADOS - PRIMEWAY SCHOOL
====================================================*/

/*
    Este arquivo não contém usuário ou senha fixos.

    Você pode configurar a conexão de duas formas:

    1. Criar:
       config/database.local.php

       usando database.local.example.php como modelo.

    2. Definir as variáveis de ambiente:

       PRIMEWAY_DB_HOST
       PRIMEWAY_DB_PORT
       PRIMEWAY_DB_NAME
       PRIMEWAY_DB_USER
       PRIMEWAY_DB_PASS

    database.local.php tem prioridade quando existir.
*/


function primewayDatabaseConfig(): array
{
    $config = [
        'host' =>
            getenv('PRIMEWAY_DB_HOST') !== false
                ? getenv('PRIMEWAY_DB_HOST')
                : '127.0.0.1',

        'port' =>
            getenv('PRIMEWAY_DB_PORT') !== false
                ? getenv('PRIMEWAY_DB_PORT')
                : '3306',

        'database' =>
            getenv('PRIMEWAY_DB_NAME') !== false
                ? getenv('PRIMEWAY_DB_NAME')
                : 'primeway_school',

        'user' =>
            getenv('PRIMEWAY_DB_USER'),

        'password' => getenv('PRIMEWAY_DB_PASS'),
        'ssl_ca' => getenv('PRIMEWAY_DB_SSL_CA') ?: null
    ];


    $localConfigPath =
        __DIR__ .
        '/database.local.php';


    if (
        is_file(
            $localConfigPath
        )
    ) {
        $localConfig =
            require $localConfigPath;


        if (
            !is_array(
                $localConfig
            )
        ) {
            throw new RuntimeException(
                'config/database.local.php deve retornar um array.'
            );
        }


        $config =
            array_merge(
                $config,
                $localConfig
            );
    }


    foreach (
        [
            'host',
            'port',
            'database',
            'user',
            'password'
        ] as $key
    ) {
        if (
            !array_key_exists(
                $key,
                $config
            ) ||
            $config[$key] === false ||
            $config[$key] === null
        ) {
            throw new RuntimeException(
                sprintf(
                    'Configuração do banco ausente: %s.',
                    $key
                )
            );
        }
    }


    primewayValidateDatabaseCredentials($config);
    // Evitar que valores de configuração alterem outros componentes do DSN.
    foreach (['host','database'] as $key) {
        if (!is_string($config[$key]) || $config[$key] === '' || preg_match('/[;\x00-\x20]/', $config[$key])) {
            throw new RuntimeException('Configuração de banco inválida.');
        }
    }
    if (filter_var($config['port'], FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>65535]]) === false) {
        throw new RuntimeException('Porta do banco inválida.');
    }
    return $config;
}

function primewayValidateDatabaseCredentials(array $config): void
{
    if (primewayProduction() && (trim((string)$config['user']) === ''
        || strtolower(trim((string)$config['user'])) === 'root' || (string)$config['password'] === '')) {
        throw new RuntimeException('Credenciais de banco inadequadas para produção.');
    }
}

function primewayDatabaseOptions(array $config): array
{
    $options = [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES=>false, PDO::ATTR_STRINGIFY_FETCHES=>false];
    if (!empty($config['ssl_ca'])) {
        if (!is_string($config['ssl_ca']) || !is_readable($config['ssl_ca'])) {
            throw new RuntimeException('CA do banco indisponível.');
        }
        $caOption = defined('Pdo\\Mysql::ATTR_SSL_CA') ? constant('Pdo\\Mysql::ATTR_SSL_CA') : PDO::MYSQL_ATTR_SSL_CA;
        $verifyOption = defined('Pdo\\Mysql::ATTR_SSL_VERIFY_SERVER_CERT') ? constant('Pdo\\Mysql::ATTR_SSL_VERIFY_SERVER_CERT') : PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT;
        $options[$caOption] = $config['ssl_ca'];
        $options[$verifyOption] = true;
    }
    return $options;
}

function primewayDatabaseRequireTls(PDO $pdo, array $config): void
{
    if (!empty($config['ssl_ca'])) {
        $status=$pdo->query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")->fetch(PDO::FETCH_NUM);
        if (!is_array($status) || empty($status[1])) {
            throw new RuntimeException('A conexão do banco requer TLS.');
        }
    }
}


function primewayPdo(): PDO
{
    static $pdo = null;


    if (
        $pdo instanceof PDO
    ) {
        return $pdo;
    }


    $config =
        primewayDatabaseConfig();


    $dsn =
        sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $config['host'],
            $config['port'],
            $config['database']
        );


    $connection =
        new PDO(
            $dsn,
            (string) $config['user'],
            (string) $config['password'],
            primewayDatabaseOptions($config)
        );


    primewayDatabaseRequireTls($connection, $config);
    $pdo = $connection;
    return $pdo;
}

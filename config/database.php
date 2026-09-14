<?php

declare(strict_types=1);

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

        'password' =>
            getenv('PRIMEWAY_DB_PASS')
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


    return $config;
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


    $pdo =
        new PDO(
            $dsn,
            (string) $config['user'],
            (string) $config['password'],
            [
                PDO::ATTR_ERRMODE =>
                    PDO::ERRMODE_EXCEPTION,

                PDO::ATTR_DEFAULT_FETCH_MODE =>
                    PDO::FETCH_ASSOC,

                PDO::ATTR_EMULATE_PREPARES =>
                    false,

                PDO::ATTR_STRINGIFY_FETCHES =>
                    false
            ]
        );


    return $pdo;
}
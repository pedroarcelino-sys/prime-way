<?php

declare(strict_types=1);

$raiz = dirname(__DIR__);
$total = 0;

function verificar(
    bool $condicao,
    string $mensagem
): void {
    global $total;
    $total++;

    if (!$condicao) {
        throw new RuntimeException(
            'Falha: ' . $mensagem
        );
    }

    echo '[OK] ' . $mensagem . PHP_EOL;
}

ini_set(
    'session.save_path',
    sys_get_temp_dir()
);

session_id(
    'primeway-test-' .
    bin2hex(random_bytes(8))
);

require_once
    $raiz .
    '/config/session.php';

try {
    $token = primewayTokenCsrf();

    verificar(
        strlen($token) === 64,
        'token CSRF possui 256 bits em hexadecimal'
    );

    $_SERVER['HTTP_X_CSRF_TOKEN'] = $token;

    verificar(
        primewayCsrfValido(),
        'token CSRF válido é aceito'
    );

    $_SERVER['HTTP_X_CSRF_TOKEN'] = 'invalido';

    verificar(
        !primewayCsrfValido(),
        'token CSRF inválido é rejeitado'
    );

    primewayLimparFalhasLogin();

    for ($tentativa = 0; $tentativa < 5; $tentativa++) {
        primewayRegistrarFalhaLogin();
    }

    verificar(
        primewayStatusLimiteLogin()['bloqueado'] === true,
        'login é bloqueado após cinco falhas na janela'
    );

    primewayLimparFalhasLogin();

    verificar(
        primewayStatusLimiteLogin()['bloqueado'] === false,
        'limite de login é limpo após autenticação válida'
    );

    $gitignore =
        file_get_contents(
            $raiz . '/.gitignore'
        );

    verificar(
        is_string($gitignore) &&
        str_contains($gitignore, 'config/database.local.php'),
        'configuração local do banco está ignorada'
    );

    foreach (
        [
            'api/configuracoes/salvar.php',
            'api/alunos/salvar.php',
            'api/alunos/excluir.php',
            'api/professores/salvar.php',
            'api/responsaveis/salvar.php',
            'api/responsaveis/excluir.php',
            'api/turmas/salvar.php',
            'api/turmas/excluir.php',
            'api/turmas/matricula.php',
            'api/estado/index.php'
        ] as $endpoint
    ) {
        $conteudo =
            file_get_contents(
                $raiz . '/' . $endpoint
            );

        verificar(
            is_string($conteudo) &&
            str_contains($conteudo, 'primewayExigirCsrf()'),
            $endpoint . ' exige CSRF'
        );
    }

    verificar(
        filesize($raiz . '/index.html') > 0,
        'entrada raiz não está vazia'
    );

    verificar(
        is_file(
            $raiz .
            '/database/migrations/010_estado_aplicacao.sql'
        ),
        'migration do estado compartilhado existe'
    );

    $paginasComAplicacao = [
        'alunos.html',
        'calendario.html',
        'chat-professor.html',
        'configuracoes.html',
        'dashboard.html',
        'disciplinas.html',
        'login.html',
        'notificacoes.html',
        'professor.html',
        'professores.html',
        'responsavel.html',
        'responsaveis.html',
        'turmas.html'
    ];

    foreach ($paginasComAplicacao as $pagina) {
        $conteudo =
            file_get_contents(
                $raiz . '/pages/' . $pagina
            );

        verificar(
            is_string($conteudo) &&
            str_contains($conteudo, '../js/core.js'),
            $pagina . ' carrega o núcleo compartilhado'
        );

        $posicaoCore =
            strpos($conteudo, '../js/core.js');
        $posicaoScriptPagina =
            strrpos($conteudo, '<script src="../js/');

        verificar(
            is_int($posicaoCore) &&
            is_int($posicaoScriptPagina) &&
            $posicaoCore <= $posicaoScriptPagina,
            $pagina . ' carrega o núcleo antes do script da página'
        );
    }

    $javascriptAlunos =
        file_get_contents(
            $raiz . '/js/alunos.js'
        );

    verificar(
        is_string($javascriptAlunos) &&
        str_contains($javascriptAlunos, '../api/alunos/index.php') &&
        str_contains($javascriptAlunos, '../api/alunos/salvar.php') &&
        str_contains($javascriptAlunos, '../api/alunos/excluir.php'),
        'módulo Alunos utiliza as APIs relacionais'
    );

    $nucleoJavascript =
        file_get_contents(
            $raiz . '/js/core.js'
        );

    preg_match(
        '/const MANAGED_STORAGE_KEYS = new Set\(\[(.*?)\]\);/s',
        (string) $nucleoJavascript,
        $estadoGerenciado
    );

    verificar(
        is_string($nucleoJavascript) &&
        isset($estadoGerenciado[1]) &&
        !str_contains($estadoGerenciado[1], '"primewayStudents"'),
        'cache de Alunos não é duplicado no estado genérico'
    );

    echo sprintf(
        "%s%d verificações concluídas com sucesso.%s",
        PHP_EOL,
        $total,
        PHP_EOL
    );
} finally {
    if (session_status() === PHP_SESSION_ACTIVE) {
        $_SESSION = [];
        session_destroy();
    }
}

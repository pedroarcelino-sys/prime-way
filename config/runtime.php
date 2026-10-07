<?php
declare(strict_types=1);

function primewayProduction(): bool
{
    return strtolower(trim((string)getenv('PRIMEWAY_APP_ENV'))) === 'production';
}

function primewayCookieSecure(): bool
{
    // Não confiar em X-Forwarded-Proto fornecido pelo cliente. O proxy deve
    // configurar HTTPS no servidor, ou usar a opção explícita abaixo.
    $setting = getenv('PRIMEWAY_SESSION_SECURE');
    return primewayProduction()
        || ($setting !== false && filter_var($setting, FILTER_VALIDATE_BOOL))
        || (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off');
}

function primewaySecurityHeaders(): array
{
    $headers = [
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'SAMEORIGIN',
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'Permissions-Policy' => 'geolocation=(self), microphone=(self), camera=(self)',
        // A interface atual contém scripts/styles inline; manter compatibilidade.
        'Content-Security-Policy' => "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://unpkg.com; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
    ];
    if (primewayProduction() && !empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') {
        $headers['Strict-Transport-Security'] = 'max-age=31536000';
    }
    return $headers;
}

if (PHP_SAPI !== 'cli') {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    ini_set('log_errors', '1');
    foreach (primewaySecurityHeaders() as $name => $value) header($name . ': ' . $value);
    set_exception_handler(static function (Throwable $error): void {
        error_log('PrimeWay erro não tratado: ' . $error->getMessage());
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['success'=>false,'message'=>'Não foi possível processar a solicitação.']);
    });
}

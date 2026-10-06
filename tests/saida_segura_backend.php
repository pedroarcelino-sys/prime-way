<?php

declare(strict_types=1);

// Executa as rotas reais com PDO e contexto substituídos, sem conexão ao banco.
if ($argc === 1) {
    $total = 0;
    $check = static function (bool $ok, string $message) use (&$total): void {
        if (!$ok) {
            throw new RuntimeException($message);
        }
        $total++;
        echo '[OK] ' . $message . PHP_EOL;
    };
    foreach (['index', 'outside', 'inside', 'already-notified', 'closed', 'invalid-id', 'invalid-coordinates', 'other-guardian'] as $case) {
        $process = proc_open([PHP_BINARY, __FILE__, $case], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        $output = stream_get_contents($pipes[1]);
        $error = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exit = proc_close($process);
        if ($exit !== 0 || $error !== '') {
            throw new RuntimeException($case . ': ' . $error);
        }
        $result = json_decode($output, true, 512, JSON_THROW_ON_ERROR);
        $data = $result['data'];
        $check($result['roles'] === ['responsavel'], $case . ': rota exige perfil responsável');
        if ($case === 'index') {
            $check($data['location']['latitude'] === 0 && $data['location']['longitude'] === 0
                && $data['location']['radiusMeters'] === 300, 'GET expõe somente a referência configurada da escola');
            continue;
        }
        $check($result['csrf'], $case . ': rota exige CSRF');
        foreach ($result['writes'] as $write) {
            $check(!preg_match('/latitude|longitude|precisao_metros|distancia_metros|ultima_localizacao/i', $write['sql']),
                $case . ': escrita sem campos de localização');
            $check(!array_key_exists(':latitude', $write['params']) && !array_key_exists(':longitude', $write['params']),
                $case . ': parâmetros persistidos não contêm coordenadas');
        }
        if (in_array($case, ['invalid-id', 'invalid-coordinates'], true)) {
            $check($result['code'] === 422 && $result['writes'] === [], $case . ': entrada inválida rejeitada sem escrita');
        } elseif (in_array($case, ['closed', 'other-guardian'], true)) {
            $check($result['code'] === ($case === 'closed' ? 409 : 404) && $result['writes'] === [],
                $case . ': solicitação inacessível ou encerrada rejeitada sem escrita');
        } else {
            $check($result['ownership'], $case . ': consulta restringe solicitação ao responsável autenticado');
            $check($data['locationStored'] === false, $case . ': resposta confirma localização transitória');
            if ($case === 'outside') {
                $check($data['status'] === 'Aguardando' && !$data['insideRadius'] && $result['writes'] === [],
                    'Coordenadas da escola enviadas pelo cliente são ignoradas; fora do raio não altera status');
            } elseif ($case === 'inside') {
                $check($data['status'] === 'No raio' && $data['staffNotified'], 'Entrada no raio altera estado e notifica equipe');
                $check(count(array_filter($result['writes'], static fn($w) => str_contains($w['sql'], 'INSERT INTO historico_saida_segura'))) === 1,
                    'Entrada mantém histórico de mudança de status');
            } else {
                $check(!$data['staffNotified'] && $result['writes'] === [], 'Atualização dentro do raio não repete aviso nem histórico');
            }
        }
    }
    echo "$total verificações isoladas de backend aprovadas." . PHP_EOL;
    exit;
}

$case = $argv[1];
$writes = [];
$roles = [];
$csrf = false;
$ownership = false;

function primewayResponderJson(array $data, int $code = 200): never
{
    global $writes, $roles, $csrf, $ownership;
    echo json_encode(compact('data', 'code', 'writes', 'roles', 'csrf', 'ownership'), JSON_THROW_ON_ERROR);
    exit;
}
function primewayExigirMetodo(string $method): void {}
function primewayExigirPerfis(array $allowed): array { $GLOBALS['roles'] = $allowed; return ['id' => 42]; }
function primewayExigirCsrf(): void { $GLOBALS['csrf'] = true; }
function primewayIdPositivo(mixed $id): ?int { return is_numeric($id) && (int)$id > 0 ? (int)$id : null; }
function primewayResponsavelContexto(PDO $pdo, array $user): array { return ['profile' => ['guardianId' => 7], 'students' => []]; }
function primewayLerJson(): array
{
    global $case;
    return ['requestId' => $case === 'invalid-id' ? 0 : 1,
        'latitude' => $case === 'invalid-coordinates' ? 91 : ($case === 'outside' ? 0.01 : 0), 'longitude' => 0,
        'schoolLatitude' => 0.01, 'schoolLongitude' => 0, 'radiusMeters' => 99999];
}
function primewaySaidaSeguraConfig(): array { return ['nome' => 'Escola de teste', 'latitude' => 0.0, 'longitude' => 0.0, 'raio_metros' => 300]; }
// Usa a fórmula original sem carregar a configuração local.
$configSource = file_get_contents(dirname(__DIR__) . '/api/responsavel/saida_segura/_config.php');
eval(substr($configSource, strpos($configSource, 'function primewayDistanciaMetros(')));

class PickupStatement extends PDOStatement
{
    public function __construct(private string $sql) {}
    public function execute(?array $params = null): bool
    {
        if (preg_match('/^\s*(INSERT|UPDATE)/', $this->sql)) {
            $GLOBALS['writes'][] = ['sql' => $this->sql, 'params' => $params];
        }
        if (str_contains($this->sql, 'FOR UPDATE')) {
            $GLOBALS['ownership'] = str_contains($this->sql, 'ss.responsavel_id = :responsavel_id')
                && ($params[':responsavel_id'] ?? null) === 7;
        }
        return true;
    }
    public function fetch(int $mode = PDO::FETCH_DEFAULT, int $cursorOrientation = PDO::FETCH_ORI_NEXT, int $cursorOffset = 0): mixed
    {
        $case = $GLOBALS['case'];
        if ($case === 'other-guardian') return false;
        return ['id' => 1, 'aluno_id' => 1, 'aluno_nome' => 'Estudante de teste',
            'status' => $case === 'closed' ? 'Liberado' : ($case === 'already-notified' ? 'No raio' : 'Aguardando'),
            'notificacao_disparada_em' => $case === 'already-notified' ? '2026-10-06 10:00:00' : null];
    }
    public function fetchAll(int $mode = PDO::FETCH_DEFAULT, mixed ...$args): array
    {
        return str_contains($this->sql, 'FROM usuarios') ? [['id' => 9]] : [];
    }
}
class PickupPdo extends PDO
{
    public function __construct() {}
    public function prepare(string $query, array $options = []): PDOStatement|false { return new PickupStatement($query); }
    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false { return new PickupStatement($query); }
    public function beginTransaction(): bool { return true; }
    public function commit(): bool { return true; }
    public function rollBack(): bool { return true; }
    public function inTransaction(): bool { return true; }
    public function lastInsertId(?string $name = null): string|false { return '10'; }
}
function primewayPdo(): PDO { return new PickupPdo(); }
$route = $case === 'index' ? 'index.php' : 'atualizar_localizacao.php';
$source = file_get_contents(dirname(__DIR__) . '/api/responsavel/saida_segura/' . $route);
$source = preg_replace('/^require_once .*;\R/m', '', $source);
eval('?>' . $source);

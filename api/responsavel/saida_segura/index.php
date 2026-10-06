<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';
require_once __DIR__ . '/_config.php';

primewayExigirMetodo('GET');

$usuario = primewayExigirPerfis(['responsavel']);

try {
    $pdo = primewayPdo();
    $contexto = primewayResponsavelContexto($pdo, $usuario);
    $config = primewaySaidaSeguraConfig();

    $stmt = $pdo->prepare(
        "
            SELECT
                ss.id,
                ss.aluno_id,
                ss.status,
                ss.tipo_retirada,
                ss.observacao,
                ss.solicitada_em,
                ss.entrou_raio_em,
                ss.preparando_em,
                ss.liberado_em,
                ss.cancelado_em,
                pe.nome AS aluno_nome
            FROM solicitacoes_saida_segura ss
            INNER JOIN alunos a
                ON a.id = ss.aluno_id
            INNER JOIN pessoas pe
                ON pe.id = a.pessoa_id
            WHERE ss.responsavel_id = :responsavel_id
            ORDER BY ss.solicitada_em DESC, ss.id DESC
            LIMIT 30
        "
    );

    $stmt->execute([
        ':responsavel_id' => (int)$contexto['profile']['guardianId']
    ]);

    $requests = array_map(
        static fn(array $row): array => [
            'id' => (int)$row['id'],
            'studentId' => (int)$row['aluno_id'],
            'studentName' => (string)$row['aluno_nome'],
            'status' => (string)$row['status'],
            'pickupType' => (string)$row['tipo_retirada'],
            'observation' => (string)($row['observacao'] ?? ''),
            'requestedAt' => (string)$row['solicitada_em'],
            'enteredRadiusAt' => $row['entrou_raio_em'],
            'preparingAt' => $row['preparando_em'],
            'releasedAt' => $row['liberado_em'],
            'cancelledAt' => $row['cancelado_em']
        ],
        $stmt->fetchAll()
    );

    primewayResponderJson([
        'success' => true,
        'students' => $contexto['students'],
        'location' => [
            'name' => $config['nome'],
            'configured' => true,
            'latitude' => $config['latitude'],
            'longitude' => $config['longitude'],
            'radiusMeters' => $config['raio_metros']
        ],
        'requests' => $requests
    ]);

} catch (Throwable $erro) {
    error_log('PrimeWay Responsável Saída Segura GET: ' . $erro->getMessage());

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível carregar a saída segura.'
    ], 500);
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/_helpers.php';

primewayExigirMetodo('GET');
primewayExigirPerfis(['secretaria']);

$inicio = trim((string) ($_GET['inicio'] ?? ''));
$fim = trim((string) ($_GET['fim'] ?? ''));

$hoje = new DateTimeImmutable('today');

if ($inicio === '') {
    $inicio = $hoje->modify('first day of this month')->format('Y-m-d');
}

if ($fim === '') {
    $fim = $hoje->modify('last day of this month')->format('Y-m-d');
}

if (
    !primewayCalendarioDataValida($inicio)
    || !primewayCalendarioDataValida($fim)
) {
    primewayCalendarioFalha('Período do calendário inválido.', 400);
}

$dataInicio = new DateTimeImmutable($inicio);
$dataFim = new DateTimeImmutable($fim);

if ($dataFim < $dataInicio) {
    primewayCalendarioFalha(
        'A data final do período deve ser igual ou posterior à inicial.',
        400
    );
}

if ((int) $dataInicio->diff($dataFim)->days > 370) {
    primewayCalendarioFalha(
        'O período máximo de consulta é de 370 dias.',
        400
    );
}

try {
    $pdo = primewayPdo();

    $stmt = $pdo->prepare(
        "
            SELECT
                ec.id,
                ec.turma_id,
                ec.criado_por_usuario_id,
                ec.titulo,
                ec.tipo,
                ec.data_evento,
                ec.horario_inicio,
                ec.horario_fim,
                ec.local,
                ec.descricao,
                ec.status,
                ec.criado_em,
                ec.atualizado_em,
                t.nome AS turma_nome,
                COALESCE(pe.nome, u.nome, u.email, '') AS criador_nome
            FROM eventos_calendario ec
            LEFT JOIN turmas t
                ON t.id = ec.turma_id
            LEFT JOIN usuarios u
                ON u.id = ec.criado_por_usuario_id
            LEFT JOIN pessoas pe
                ON pe.id = u.pessoa_id
            WHERE ec.data_evento BETWEEN :inicio AND :fim
            ORDER BY
                ec.data_evento ASC,
                COALESCE(ec.horario_inicio, '23:59:59') ASC,
                ec.id ASC
        "
    );

    $stmt->execute([
        ':inicio' => $inicio,
        ':fim' => $fim
    ]);

    $events = array_map(
        'primewayCalendarioMapearEvento',
        $stmt->fetchAll()
    );

    $stmtUpcoming = $pdo->query(
        "
            SELECT
                ec.id,
                ec.turma_id,
                ec.criado_por_usuario_id,
                ec.titulo,
                ec.tipo,
                ec.data_evento,
                ec.horario_inicio,
                ec.horario_fim,
                ec.local,
                ec.descricao,
                ec.status,
                ec.criado_em,
                ec.atualizado_em,
                t.nome AS turma_nome,
                COALESCE(pe.nome, u.nome, u.email, '') AS criador_nome
            FROM eventos_calendario ec
            LEFT JOIN turmas t
                ON t.id = ec.turma_id
            LEFT JOIN usuarios u
                ON u.id = ec.criado_por_usuario_id
            LEFT JOIN pessoas pe
                ON pe.id = u.pessoa_id
            WHERE ec.status = 'Agendado'
              AND ec.data_evento >= CURDATE()
            ORDER BY
                ec.data_evento ASC,
                COALESCE(ec.horario_inicio, '23:59:59') ASC,
                ec.id ASC
            LIMIT 10
        "
    );

    $upcoming = array_map(
        'primewayCalendarioMapearEvento',
        $stmtUpcoming->fetchAll()
    );

    $stmtClasses = $pdo->query(
        "
            SELECT
                t.id,
                t.nome,
                t.status
            FROM turmas t
            INNER JOIN anos_letivos al
                ON al.id = t.ano_letivo_id
            WHERE al.ativo = 1
              AND t.status = 'Ativa'
            ORDER BY t.nome ASC
        "
    );

    $classes = array_map(
        static fn (array $row): array => [
            'id' => (int) $row['id'],
            'name' => (string) $row['nome'],
            'status' => (string) $row['status']
        ],
        $stmtClasses->fetchAll()
    );

    primewayResponderJson([
        'success' => true,
        'period' => [
            'start' => $inicio,
            'end' => $fim
        ],
        'events' => $events,
        'upcoming' => $upcoming,
        'classes' => $classes
    ]);

} catch (Throwable $erro) {
    error_log('PrimeWay Secretaria Calendário GET: ' . $erro->getMessage());

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível carregar o calendário.'
    ], 500);
}

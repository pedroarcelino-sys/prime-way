<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

function primewayCalendarioFalha(
    string $mensagem,
    int $status = 422
): never {
    primewayResponderJson([
        'success' => false,
        'message' => $mensagem
    ], $status);
}

function primewayCalendarioDataValida(string $valor): bool
{
    $data = DateTimeImmutable::createFromFormat('!Y-m-d', $valor);

    return $data !== false
        && $data->format('Y-m-d') === $valor;
}

function primewayCalendarioHoraValida(string $valor): bool
{
    return preg_match('/^(?:[01]\\d|2[0-3]):[0-5]\\d$/', $valor) === 1;
}

function primewayCalendarioNormalizarHora(mixed $valor): ?string
{
    $hora = trim((string) ($valor ?? ''));

    if ($hora === '') {
        return null;
    }

    if (!primewayCalendarioHoraValida($hora)) {
        primewayCalendarioFalha('Horário inválido.');
    }

    return $hora;
}

function primewayCalendarioValidarTurma(
    PDO $pdo,
    mixed $valor
): ?int {
    if ($valor === null || $valor === '') {
        return null;
    }

    $turmaId = primewayIdPositivo($valor);

    if ($turmaId === null) {
        primewayCalendarioFalha('Turma inválida.');
    }

    $stmt = $pdo->prepare(
        "
            SELECT t.id
            FROM turmas t
            INNER JOIN anos_letivos al
                ON al.id = t.ano_letivo_id
            WHERE t.id = :turma_id
              AND t.status = 'Ativa'
              AND al.ativo = 1
            LIMIT 1
        "
    );

    $stmt->execute([
        ':turma_id' => $turmaId
    ]);

    if (!$stmt->fetch()) {
        primewayCalendarioFalha(
            'A turma selecionada não está ativa no ano letivo atual.',
            409
        );
    }

    return $turmaId;
}

function primewayCalendarioLerEventoPayload(
    PDO $pdo,
    array $dados
): array {
    $titulo = trim((string) ($dados['title'] ?? ''));
    $tipo = trim((string) ($dados['type'] ?? ''));
    $dataEvento = trim((string) ($dados['date'] ?? ''));
    $horaInicio = primewayCalendarioNormalizarHora(
        $dados['timeStart'] ?? null
    );
    $horaFim = primewayCalendarioNormalizarHora(
        $dados['timeEnd'] ?? null
    );
    $local = trim((string) ($dados['location'] ?? ''));
    $descricao = trim((string) ($dados['description'] ?? ''));

    if ($titulo === '') {
        primewayCalendarioFalha('Informe o título do evento.');
    }

    if (mb_strlen($titulo) > 190) {
        primewayCalendarioFalha(
            'O título deve possuir no máximo 190 caracteres.'
        );
    }

    $tiposPermitidos = [
        'Prova',
        'Atividade',
        'Reunião',
        'Evento',
        'Feriado',
        'Aviso'
    ];

    if (!in_array($tipo, $tiposPermitidos, true)) {
        primewayCalendarioFalha('Tipo de evento inválido.');
    }

    if (!primewayCalendarioDataValida($dataEvento)) {
        primewayCalendarioFalha('Informe uma data válida.');
    }

    if ($horaFim !== null && $horaInicio === null) {
        primewayCalendarioFalha(
            'Informe o horário de início antes do horário de término.'
        );
    }

    if (
        $horaInicio !== null
        && $horaFim !== null
        && strcmp($horaFim, $horaInicio) <= 0
    ) {
        primewayCalendarioFalha(
            'O horário de término deve ser posterior ao horário de início.'
        );
    }

    if (mb_strlen($local) > 190) {
        primewayCalendarioFalha(
            'O local deve possuir no máximo 190 caracteres.'
        );
    }

    if (mb_strlen($descricao) > 10000) {
        primewayCalendarioFalha('A descrição está muito longa.');
    }

    return [
        'title' => $titulo,
        'type' => $tipo,
        'date' => $dataEvento,
        'timeStart' => $horaInicio,
        'timeEnd' => $horaFim,
        'location' => $local !== '' ? $local : null,
        'description' => $descricao !== '' ? $descricao : null,
        'classId' => primewayCalendarioValidarTurma(
            $pdo,
            $dados['classId'] ?? null
        )
    ];
}

function primewayCalendarioMapearEvento(array $row): array
{
    $horaInicio = $row['horario_inicio'] !== null
        ? substr((string) $row['horario_inicio'], 0, 5)
        : '';

    $horaFim = $row['horario_fim'] !== null
        ? substr((string) $row['horario_fim'], 0, 5)
        : '';

    return [
        'id' => (int) $row['id'],
        'title' => (string) $row['titulo'],
        'type' => (string) $row['tipo'],
        'date' => (string) $row['data_evento'],
        'timeStart' => $horaInicio,
        'timeEnd' => $horaFim,
        'location' => (string) ($row['local'] ?? ''),
        'description' => (string) ($row['descricao'] ?? ''),
        'status' => (string) $row['status'],
        'classId' => $row['turma_id'] !== null
            ? (int) $row['turma_id']
            : null,
        'className' => (string) ($row['turma_nome'] ?? ''),
        'createdByUserId' => $row['criado_por_usuario_id'] !== null
            ? (int) $row['criado_por_usuario_id']
            : null,
        'creatorName' => (string) ($row['criador_nome'] ?? ''),
        'createdAt' => (string) ($row['criado_em'] ?? ''),
        'updatedAt' => (string) ($row['atualizado_em'] ?? '')
    ];
}

function primewayCalendarioBuscarEvento(
    PDO $pdo,
    int $id
): ?array {
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
            WHERE ec.id = :id
            LIMIT 1
        "
    );

    $stmt->execute([
        ':id' => $id
    ]);

    $row = $stmt->fetch();

    return $row
        ? primewayCalendarioMapearEvento($row)
        : null;
}

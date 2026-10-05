<?php

declare(strict_types=1);

require_once __DIR__ . '/_helpers.php';

primewayExigirMetodo('POST');
$usuario = primewayExigirPerfis(['secretaria']);
primewayExigirCsrf();

$dados = primewayLerJson();

try {
    $pdo = primewayPdo();
    $evento = primewayCalendarioLerEventoPayload($pdo, $dados);

    $stmt = $pdo->prepare(
        "
            INSERT INTO eventos_calendario (
                turma_id,
                criado_por_usuario_id,
                titulo,
                tipo,
                data_evento,
                horario_inicio,
                horario_fim,
                local,
                descricao,
                status
            ) VALUES (
                :turma_id,
                :usuario_id,
                :titulo,
                :tipo,
                :data_evento,
                :horario_inicio,
                :horario_fim,
                :local,
                :descricao,
                'Agendado'
            )
        "
    );

    $stmt->execute([
        ':turma_id' => $evento['classId'],
        ':usuario_id' => (int) $usuario['id'],
        ':titulo' => $evento['title'],
        ':tipo' => $evento['type'],
        ':data_evento' => $evento['date'],
        ':horario_inicio' => $evento['timeStart'],
        ':horario_fim' => $evento['timeEnd'],
        ':local' => $evento['location'],
        ':descricao' => $evento['description']
    ]);

    $id = (int) $pdo->lastInsertId();
    $criado = primewayCalendarioBuscarEvento($pdo, $id);

    primewayResponderJson([
        'success' => true,
        'message' => 'Evento criado com sucesso.',
        'event' => $criado
    ], 201);

} catch (Throwable $erro) {
    error_log('PrimeWay Secretaria Calendário criar: ' . $erro->getMessage());

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível criar o evento.'
    ], 500);
}

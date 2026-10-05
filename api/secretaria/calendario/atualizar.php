<?php

declare(strict_types=1);

require_once __DIR__ . '/_helpers.php';

primewayExigirMetodo('POST');
primewayExigirPerfis(['secretaria']);
primewayExigirCsrf();

$dados = primewayLerJson();
$id = primewayIdPositivo($dados['id'] ?? null);

if ($id === null) {
    primewayCalendarioFalha('Evento inválido.', 400);
}

try {
    $pdo = primewayPdo();
    $atual = primewayCalendarioBuscarEvento($pdo, $id);

    if ($atual === null) {
        primewayCalendarioFalha('Evento não encontrado.', 404);
    }

    if ($atual['status'] !== 'Agendado') {
        primewayCalendarioFalha(
            'Somente eventos agendados podem ser editados.',
            409
        );
    }

    $evento = primewayCalendarioLerEventoPayload($pdo, $dados);

    $stmt = $pdo->prepare(
        "
            UPDATE eventos_calendario
            SET
                turma_id = :turma_id,
                titulo = :titulo,
                tipo = :tipo,
                data_evento = :data_evento,
                horario_inicio = :horario_inicio,
                horario_fim = :horario_fim,
                local = :local,
                descricao = :descricao
            WHERE id = :id
              AND status = 'Agendado'
        "
    );

    $stmt->execute([
        ':turma_id' => $evento['classId'],
        ':titulo' => $evento['title'],
        ':tipo' => $evento['type'],
        ':data_evento' => $evento['date'],
        ':horario_inicio' => $evento['timeStart'],
        ':horario_fim' => $evento['timeEnd'],
        ':local' => $evento['location'],
        ':descricao' => $evento['description'],
        ':id' => $id
    ]);

    if ($stmt->rowCount() === 0) {
        $aposTentativa = primewayCalendarioBuscarEvento($pdo, $id);

        if (
            $aposTentativa === null
            || $aposTentativa['status'] !== 'Agendado'
        ) {
            primewayCalendarioFalha(
                'O evento foi alterado por outra operação. Atualize o calendário e tente novamente.',
                409
            );
        }
    }

    $atualizado = primewayCalendarioBuscarEvento($pdo, $id);

    primewayResponderJson([
        'success' => true,
        'message' => 'Evento atualizado com sucesso.',
        'event' => $atualizado
    ]);

} catch (Throwable $erro) {
    error_log('PrimeWay Secretaria Calendário atualizar: ' . $erro->getMessage());

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível atualizar o evento.'
    ], 500);
}

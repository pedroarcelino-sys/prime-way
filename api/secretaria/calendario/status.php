<?php

declare(strict_types=1);

require_once __DIR__ . '/_helpers.php';

primewayExigirMetodo('POST');
primewayExigirPerfis(['secretaria']);
primewayExigirCsrf();

$dados = primewayLerJson();
$id = primewayIdPositivo($dados['id'] ?? null);
$status = trim((string) ($dados['status'] ?? ''));

if ($id === null) {
    primewayCalendarioFalha('Evento inválido.', 400);
}

if (!in_array($status, ['Concluído', 'Cancelado'], true)) {
    primewayCalendarioFalha('Status de evento inválido.', 400);
}

try {
    $pdo = primewayPdo();
    $atual = primewayCalendarioBuscarEvento($pdo, $id);

    if ($atual === null) {
        primewayCalendarioFalha('Evento não encontrado.', 404);
    }

    if ($atual['status'] !== 'Agendado') {
        primewayCalendarioFalha(
            'Este evento não está mais agendado.',
            409
        );
    }

    $stmt = $pdo->prepare(
        "
            UPDATE eventos_calendario
            SET status = :status
            WHERE id = :id
              AND status = 'Agendado'
        "
    );

    $stmt->execute([
        ':status' => $status,
        ':id' => $id
    ]);

    if ($stmt->rowCount() !== 1) {
        primewayCalendarioFalha(
            'O evento foi alterado por outra operação. Atualize o calendário e tente novamente.',
            409
        );
    }

    $atualizado = primewayCalendarioBuscarEvento($pdo, $id);

    primewayResponderJson([
        'success' => true,
        'message' => $status === 'Cancelado'
            ? 'Evento cancelado com sucesso.'
            : 'Evento concluído com sucesso.',
        'event' => $atualizado
    ]);

} catch (Throwable $erro) {
    error_log('PrimeWay Secretaria Calendário status: ' . $erro->getMessage());

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível alterar o status do evento.'
    ], 500);
}

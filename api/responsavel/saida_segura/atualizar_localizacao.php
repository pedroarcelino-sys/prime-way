<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';
require_once __DIR__ . '/_config.php';

primewayExigirMetodo('POST');

$usuario = primewayExigirPerfis(['responsavel']);
primewayExigirCsrf();

$dados = primewayLerJson();

$requestId = primewayIdPositivo($dados['requestId'] ?? null);
$latitude = filter_var($dados['latitude'] ?? null, FILTER_VALIDATE_FLOAT);
$longitude = filter_var($dados['longitude'] ?? null, FILTER_VALIDATE_FLOAT);

if ($requestId === null) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Solicitação inválida.'
    ], 422);
}

if ($latitude === false || $latitude < -90 || $latitude > 90) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Latitude inválida.'
    ], 422);
}

if ($longitude === false || $longitude < -180 || $longitude > 180) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Longitude inválida.'
    ], 422);
}

try {
    $pdo = primewayPdo();
    $contexto = primewayResponsavelContexto($pdo, $usuario);
    $config = primewaySaidaSeguraConfig();

    $guardianId = (int)$contexto['profile']['guardianId'];

    // A localização atual é usada apenas nesta requisição.
    // Ela NÃO é persistida no MySQL.
    $distance = primewayDistanciaMetros(
        (float)$latitude,
        (float)$longitude,
        $config['latitude'],
        $config['longitude']
    );

    $inside = $distance <= (float)$config['raio_metros'];

    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        "
            SELECT
                ss.id,
                ss.aluno_id,
                ss.status,
                ss.notificacao_disparada_em,
                pe.nome AS aluno_nome
            FROM solicitacoes_saida_segura ss
            INNER JOIN alunos a
                ON a.id = ss.aluno_id
            INNER JOIN pessoas pe
                ON pe.id = a.pessoa_id
            WHERE ss.id = :solicitacao_id
              AND ss.responsavel_id = :responsavel_id
            LIMIT 1
            FOR UPDATE
        "
    );

    $stmt->execute([
        ':solicitacao_id' => $requestId,
        ':responsavel_id' => $guardianId
    ]);

    $request = $stmt->fetch();

    if (!$request) {
        $pdo->rollBack();

        primewayResponderJson([
            'success' => false,
            'message' => 'Solicitação não encontrada.'
        ], 404);
    }

    if (!in_array(
        $request['status'],
        ['Aguardando', 'No raio', 'Preparando'],
        true
    )) {
        $pdo->rollBack();

        primewayResponderJson([
            'success' => false,
            'message' => 'Esta solicitação já foi encerrada.'
        ], 409);
    }

    $newStatus = (string)$request['status'];
    $enteredNow = false;

    if ($inside && $newStatus === 'Aguardando') {
        $newStatus = 'No raio';
        $enteredNow = true;
    }

    if ($enteredNow) {
        $pdo->prepare(
            "
                UPDATE solicitacoes_saida_segura
                SET
                    status = 'No raio',
                    entrou_raio_em = COALESCE(
                        entrou_raio_em,
                        CURRENT_TIMESTAMP
                    )
                WHERE id = :solicitacao_id
            "
        )->execute([
            ':solicitacao_id' => $requestId
        ]);

        $pdo->prepare(
            "
                INSERT INTO historico_saida_segura (
                    solicitacao_id,
                    usuario_id,
                    status_anterior,
                    status_novo,
                    observacao
                )
                VALUES (
                    :solicitacao_id,
                    :usuario_id,
                    'Aguardando',
                    'No raio',
                    :observacao
                )
            "
        )->execute([
            ':solicitacao_id' => $requestId,
            ':usuario_id' => (int)$usuario['id'],
            ':observacao' => sprintf(
                'Entrada detectada no raio de %d m. Coordenadas atuais não armazenadas.',
                $config['raio_metros']
            )
        ]);
    }

    $notified = false;

    if ($inside && $request['notificacao_disparada_em'] === null) {
        $stmtNotification = $pdo->prepare(
            "
                INSERT INTO notificacoes (
                    criado_por_usuario_id,
                    titulo,
                    tipo,
                    publico,
                    mensagem,
                    origem,
                    status,
                    publicada_em
                )
                VALUES (
                    :usuario_id,
                    'Responsável próximo à escola',
                    'Saída segura',
                    'Equipe escolar',
                    :mensagem,
                    'GPS',
                    'Publicada',
                    CURRENT_TIMESTAMP
                )
            "
        );

        $stmtNotification->execute([
            ':usuario_id' => (int)$usuario['id'],
            ':mensagem' => sprintf(
                '%s entrou no raio de saída segura de %d m.',
                (string)$request['aluno_nome'],
                $config['raio_metros']
            )
        ]);

        $notificationId = (int)$pdo->lastInsertId();

        $stmtStaff = $pdo->query(
            "
                SELECT id
                FROM usuarios
                WHERE ativo = 1
                  AND perfil IN ('admin', 'secretaria')
            "
        );

        $stmtRecipient = $pdo->prepare(
            "
                INSERT IGNORE INTO notificacao_destinatarios (
                    notificacao_id,
                    usuario_id,
                    recebida_em
                )
                VALUES (
                    :notificacao_id,
                    :usuario_id,
                    CURRENT_TIMESTAMP
                )
            "
        );

        foreach ($stmtStaff->fetchAll() as $staff) {
            $stmtRecipient->execute([
                ':notificacao_id' => $notificationId,
                ':usuario_id' => (int)$staff['id']
            ]);
        }

        $pdo->prepare(
            "
                UPDATE solicitacoes_saida_segura
                SET notificacao_disparada_em = CURRENT_TIMESTAMP
                WHERE id = :solicitacao_id
            "
        )->execute([
            ':solicitacao_id' => $requestId
        ]);

        $notified = true;
    }

    $pdo->commit();

    primewayResponderJson([
        'success' => true,
        'requestId' => $requestId,
        'status' => $newStatus,
        'insideRadius' => $inside,
        'distanceMeters' => round($distance, 2),
        'radiusMeters' => $config['raio_metros'],
        'staffNotified' => $notified,
        'locationStored' => false
    ]);

} catch (Throwable $erro) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log(
        'PrimeWay Responsável Saída Segura Localização POST: '
        . $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível processar a localização.'
    ], 500);
}

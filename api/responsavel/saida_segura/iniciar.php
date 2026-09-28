<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';
require_once __DIR__ . '/_config.php';

primewayExigirMetodo('POST');

$usuario = primewayExigirPerfis(['responsavel']);
primewayExigirCsrf();

$dados = primewayLerJson();

$studentId = primewayIdPositivo($dados['studentId'] ?? null);
$observation = is_string($dados['observation'] ?? null)
    ? trim($dados['observation'])
    : '';

if ($studentId === null) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Selecione um aluno.'
    ], 422);
}

if (mb_strlen($observation) > 500) {
    primewayResponderJson([
        'success' => false,
        'message' => 'A observação deve possuir no máximo 500 caracteres.'
    ], 422);
}

try {
    $pdo = primewayPdo();
    $contexto = primewayResponsavelContexto($pdo, $usuario);
    $config = primewaySaidaSeguraConfig();

    $student = primewayResponsavelExigirAluno($contexto, $studentId);

    if (!$student['authorizedPickup']) {
        primewayResponderJson([
            'success' => false,
            'message' => 'Este responsável não está autorizado para retirada deste aluno.'
        ], 403);
    }

    $guardianId = (int)$contexto['profile']['guardianId'];

    $pdo->beginTransaction();

    $stmtExisting = $pdo->prepare(
        "
            SELECT id
            FROM solicitacoes_saida_segura
            WHERE aluno_id = :aluno_id
              AND responsavel_id = :responsavel_id
              AND status IN ('Aguardando', 'No raio', 'Preparando')
            ORDER BY id DESC
            LIMIT 1
            FOR UPDATE
        "
    );

    $stmtExisting->execute([
        ':aluno_id' => $studentId,
        ':responsavel_id' => $guardianId
    ]);

    $existing = $stmtExisting->fetch();

    if ($existing) {
        $pdo->commit();

        primewayResponderJson([
            'success' => false,
            'message' => 'Já existe uma solicitação de retirada ativa para este aluno.',
            'requestId' => (int)$existing['id']
        ], 409);
    }

    $stmtCreate = $pdo->prepare(
        "
            INSERT INTO solicitacoes_saida_segura (
                aluno_id,
                responsavel_id,
                status,
                tipo_retirada,
                observacao,
                solicitada_em
            )
            VALUES (
                :aluno_id,
                :responsavel_id,
                'Aguardando',
                'Responsavel',
                :observacao,
                CURRENT_TIMESTAMP
            )
        "
    );

    $stmtCreate->execute([
        ':aluno_id' => $studentId,
        ':responsavel_id' => $guardianId,
        ':observacao' => $observation !== '' ? $observation : null
    ]);

    $requestId = (int)$pdo->lastInsertId();

    $stmtHistory = $pdo->prepare(
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
                NULL,
                'Aguardando',
                :observacao
            )
        "
    );

    $stmtHistory->execute([
        ':solicitacao_id' => $requestId,
        ':usuario_id' => (int)$usuario['id'],
        ':observacao' => sprintf(
            'Solicitação iniciada. Referência: %s. Raio: %d m.',
            $config['nome'],
            $config['raio_metros']
        )
    ]);

    $pdo->commit();

    primewayResponderJson([
        'success' => true,
        'message' => 'Solicitação de retirada iniciada.',
        'requestId' => $requestId,
        'radiusMeters' => $config['raio_metros']
    ], 201);

} catch (Throwable $erro) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('PrimeWay Responsável Saída Segura Iniciar POST: ' . $erro->getMessage());

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível iniciar a solicitação de retirada.'
    ], 500);
}

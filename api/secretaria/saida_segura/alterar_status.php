<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('POST');

$usuario = primewayExigirPerfis([
    'secretaria',
    'admin'
]);

primewayExigirCsrf();

$dados = primewayLerJson();

$requestId = primewayIdPositivo(
    $dados['requestId']
    ?? null
);

$nextStatus = trim(
    (string) (
        $dados['nextStatus']
        ?? ''
    )
);

if ($requestId === null) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Solicitação inválida.'
    ], 422);
}

if (
    !in_array(
        $nextStatus,
        ['Preparando', 'Liberado'],
        true
    )
) {
    primewayResponderJson([
        'success' => false,
        'message' => 'Status de destino inválido.'
    ], 422);
}

try {

    $pdo = primewayPdo();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        "
            SELECT
                ss.id,
                ss.status,
                ss.aluno_id,
                ss.responsavel_id,

                aluno_pe.nome AS aluno_nome,
                resp_pe.nome AS responsavel_nome,

                resp_u.id AS responsavel_usuario_id

            FROM solicitacoes_saida_segura ss

            INNER JOIN alunos a
                ON a.id = ss.aluno_id

            INNER JOIN pessoas aluno_pe
                ON aluno_pe.id = a.pessoa_id

            INNER JOIN responsaveis r
                ON r.id = ss.responsavel_id

            INNER JOIN pessoas resp_pe
                ON resp_pe.id = r.pessoa_id

            LEFT JOIN usuarios resp_u
                ON resp_u.pessoa_id = resp_pe.id
               AND resp_u.perfil = 'responsavel'
               AND resp_u.ativo = 1

            WHERE ss.id = :solicitacao_id

            LIMIT 1

            FOR UPDATE
        "
    );

    $stmt->execute([
        ':solicitacao_id' => $requestId
    ]);

    $request = $stmt->fetch();

    if (!$request) {
        $pdo->rollBack();

        primewayResponderJson([
            'success' => false,
            'message' => 'Solicitação não encontrada.'
        ], 404);
    }

    $currentStatus = (string) $request['status'];

    $allowed = (
        $currentStatus === 'No raio'
        && $nextStatus === 'Preparando'
    ) || (
        $currentStatus === 'Preparando'
        && $nextStatus === 'Liberado'
    );

    if (!$allowed) {
        $pdo->rollBack();

        primewayResponderJson([
            'success' => false,
            'message' =>
                sprintf(
                    'Não é permitido alterar de %s para %s.',
                    $currentStatus,
                    $nextStatus
                )
        ], 409);
    }

    if ($nextStatus === 'Preparando') {

        $stmtUpdate = $pdo->prepare(
            "
                UPDATE solicitacoes_saida_segura
                SET
                    status = 'Preparando',
                    preparando_em = COALESCE(
                        preparando_em,
                        CURRENT_TIMESTAMP
                    )
                WHERE id = :solicitacao_id
            "
        );

    } else {

        $stmtUpdate = $pdo->prepare(
            "
                UPDATE solicitacoes_saida_segura
                SET
                    status = 'Liberado',
                    liberado_em = COALESCE(
                        liberado_em,
                        CURRENT_TIMESTAMP
                    )
                WHERE id = :solicitacao_id
            "
        );
    }

    $stmtUpdate->execute([
        ':solicitacao_id' => $requestId
    ]);

    $historyMessage = $nextStatus === 'Preparando'
        ? 'Equipe escolar iniciou a preparação para a retirada.'
        : 'Aluno liberado pela equipe escolar.';

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
                :status_anterior,
                :status_novo,
                :observacao
            )
        "
    );

    $stmtHistory->execute([
        ':solicitacao_id' => $requestId,
        ':usuario_id' => (int) $usuario['id'],
        ':status_anterior' => $currentStatus,
        ':status_novo' => $nextStatus,
        ':observacao' => $historyMessage
    ]);

    $guardianUserId = $request['responsavel_usuario_id'] !== null
        ? (int) $request['responsavel_usuario_id']
        : null;

    if ($guardianUserId !== null) {

        $notificationMessage =
            $nextStatus === 'Preparando'
                ? sprintf(
                    'A equipe escolar está preparando %s para a retirada.',
                    (string) $request['aluno_nome']
                )
                : sprintf(
                    '%s foi liberado pela equipe escolar.',
                    (string) $request['aluno_nome']
                );

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
                    :titulo,
                    'Saída segura',
                    'Responsável',
                    :mensagem,
                    'SaidaSegura',
                    'Publicada',
                    CURRENT_TIMESTAMP
                )
            "
        );

        $stmtNotification->execute([
            ':usuario_id' => (int) $usuario['id'],
            ':titulo' => $nextStatus === 'Preparando'
                ? 'Aluno em preparação'
                : 'Aluno liberado',
            ':mensagem' => $notificationMessage
        ]);

        $notificationId =
            (int) $pdo->lastInsertId();

        $stmtRecipient = $pdo->prepare(
            "
                INSERT INTO notificacao_destinatarios (
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

        $stmtRecipient->execute([
            ':notificacao_id' => $notificationId,
            ':usuario_id' => $guardianUserId
        ]);
    }

    $pdo->commit();

    primewayResponderJson([
        'success' => true,
        'message' =>
            $nextStatus === 'Preparando'
                ? 'Aluno marcado como em preparação.'
                : 'Aluno liberado com sucesso.',
        'status' => $nextStatus
    ]);

} catch (Throwable $erro) {

    if (
        isset($pdo)
        &&
        $pdo instanceof PDO
        &&
        $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }

    error_log(
        'PrimeWay Secretaria Saída Segura POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' =>
            'Não foi possível atualizar a saída segura.'
    ], 500);
}

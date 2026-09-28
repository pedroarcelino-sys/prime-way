<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/_contexto.php';

primewayExigirMetodo('GET');

$usuario = primewayExigirPerfis([
    'secretaria'
]);

try {

    $pdo = primewayPdo();

    $profile = primewaySecretariaContexto(
        $pdo,
        $usuario
    );

    $count = static function (
        PDO $pdo,
        string $sql
    ): int {
        return (int) $pdo
            ->query($sql)
            ->fetchColumn();
    };

    $stmtUnread = $pdo->prepare(
        "
            SELECT COUNT(*)
            FROM notificacao_destinatarios
            WHERE usuario_id = :usuario_id
              AND lida_em IS NULL
              AND excluida_em IS NULL
        "
    );

    $stmtUnread->execute([
        ':usuario_id' => (int) $usuario['id']
    ]);

    $stmtRecent = $pdo->query(
        "
            SELECT
                ss.id,
                ss.status,
                ss.solicitada_em,
                ss.entrou_raio_em,
                ss.preparando_em,

                aluno_pe.nome AS aluno_nome,
                resp_pe.nome AS responsavel_nome

            FROM solicitacoes_saida_segura ss

            INNER JOIN alunos a
                ON a.id = ss.aluno_id

            INNER JOIN pessoas aluno_pe
                ON aluno_pe.id = a.pessoa_id

            INNER JOIN responsaveis r
                ON r.id = ss.responsavel_id

            INNER JOIN pessoas resp_pe
                ON resp_pe.id = r.pessoa_id

            WHERE ss.status IN (
                'Aguardando',
                'No raio',
                'Preparando'
            )

            ORDER BY
                CASE ss.status
                    WHEN 'No raio' THEN 1
                    WHEN 'Preparando' THEN 2
                    ELSE 3
                END,
                ss.solicitada_em ASC,
                ss.id ASC

            LIMIT 8
        "
    );

    $requests = array_map(
        static fn (array $row): array => [
            'id' => (int) $row['id'],
            'studentName' => (string) $row['aluno_nome'],
            'guardianName' => (string) $row['responsavel_nome'],
            'status' => (string) $row['status'],
            'requestedAt' => (string) $row['solicitada_em'],
            'enteredRadiusAt' => $row['entrou_raio_em'],
            'preparingAt' => $row['preparando_em']
        ],
        $stmtRecent->fetchAll()
    );

    primewayResponderJson([
        'success' => true,

        'profile' => $profile,

        'summary' => [
            'students' => $count(
                $pdo,
                "SELECT COUNT(*) FROM alunos WHERE status = 'ativo'"
            ),

            'guardians' => $count(
                $pdo,
                "SELECT COUNT(*) FROM responsaveis WHERE status = 'ativo'"
            ),

            'activePickup' => $count(
                $pdo,
                "
                    SELECT COUNT(*)
                    FROM solicitacoes_saida_segura
                    WHERE status IN (
                        'Aguardando',
                        'No raio',
                        'Preparando'
                    )
                "
            ),

            'insideRadius' => $count(
                $pdo,
                "
                    SELECT COUNT(*)
                    FROM solicitacoes_saida_segura
                    WHERE status = 'No raio'
                "
            ),

            'preparing' => $count(
                $pdo,
                "
                    SELECT COUNT(*)
                    FROM solicitacoes_saida_segura
                    WHERE status = 'Preparando'
                "
            ),

            'releasedToday' => $count(
                $pdo,
                "
                    SELECT COUNT(*)
                    FROM solicitacoes_saida_segura
                    WHERE status = 'Liberado'
                      AND DATE(liberado_em) = CURRENT_DATE
                "
            ),

            'unreadNotifications' =>
                (int) $stmtUnread->fetchColumn()
        ],

        'pickupRequests' => $requests
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Secretaria Dashboard GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' =>
            'Não foi possível carregar o painel da Secretaria.'
    ], 500);
}

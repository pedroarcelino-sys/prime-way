<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('GET');

primewayExigirPerfis([
    'secretaria',
    'admin'
]);

try {

    $pdo = primewayPdo();

    $stmt = $pdo->query(
        "
            SELECT
                ss.id,
                ss.aluno_id,
                ss.responsavel_id,
                ss.status,
                ss.tipo_retirada,
                ss.observacao,
                ss.solicitada_em,
                ss.entrou_raio_em,
                ss.preparando_em,
                ss.liberado_em,
                ss.cancelado_em,

                aluno_pe.nome AS aluno_nome,
                a.matricula AS aluno_matricula,

                t.nome AS turma_nome,
                t.serie,
                t.turno,

                resp_pe.nome AS responsavel_nome,
                resp_pe.telefone AS responsavel_telefone

            FROM solicitacoes_saida_segura ss

            INNER JOIN alunos a
                ON a.id = ss.aluno_id

            INNER JOIN pessoas aluno_pe
                ON aluno_pe.id = a.pessoa_id

            INNER JOIN responsaveis r
                ON r.id = ss.responsavel_id

            INNER JOIN pessoas resp_pe
                ON resp_pe.id = r.pessoa_id

            LEFT JOIN matriculas m
                ON m.aluno_id = a.id
               AND m.situacao = 'Ativa'

            LEFT JOIN turmas t
                ON t.id = m.turma_id

            ORDER BY
                CASE ss.status
                    WHEN 'No raio' THEN 1
                    WHEN 'Preparando' THEN 2
                    WHEN 'Aguardando' THEN 3
                    WHEN 'Liberado' THEN 4
                    ELSE 5
                END,
                ss.solicitada_em DESC,
                ss.id DESC

            LIMIT 100
        "
    );

    $requests = array_map(
        static fn (array $row): array => [
            'id' => (int) $row['id'],
            'studentId' => (int) $row['aluno_id'],
            'studentName' => (string) $row['aluno_nome'],
            'registration' => (string) (
                $row['aluno_matricula']
                ?? ''
            ),
            'className' => (string) (
                $row['turma_nome']
                ?? ''
            ),
            'series' => (string) (
                $row['serie']
                ?? ''
            ),
            'shift' => (string) (
                $row['turno']
                ?? ''
            ),
            'guardianId' => (int) $row['responsavel_id'],
            'guardianName' => (string) $row['responsavel_nome'],
            'guardianPhone' => (string) (
                $row['responsavel_telefone']
                ?? ''
            ),
            'status' => (string) $row['status'],
            'pickupType' => (string) $row['tipo_retirada'],
            'observation' => (string) (
                $row['observacao']
                ?? ''
            ),
            'requestedAt' => (string) $row['solicitada_em'],
            'enteredRadiusAt' => $row['entrou_raio_em'],
            'preparingAt' => $row['preparando_em'],
            'releasedAt' => $row['liberado_em'],
            'cancelledAt' => $row['cancelado_em']
        ],
        $stmt->fetchAll()
    );

    $active = 0;
    $inside = 0;
    $preparing = 0;
    $releasedToday = 0;

    foreach ($requests as $request) {
        if (in_array(
            $request['status'],
            ['Aguardando', 'No raio', 'Preparando'],
            true
        )) {
            $active++;
        }

        if ($request['status'] === 'No raio') {
            $inside++;
        }

        if ($request['status'] === 'Preparando') {
            $preparing++;
        }

        if (
            $request['status'] === 'Liberado'
            &&
            $request['releasedAt'] !== null
            &&
            substr(
                (string) $request['releasedAt'],
                0,
                10
            ) === date('Y-m-d')
        ) {
            $releasedToday++;
        }
    }

    primewayResponderJson([
        'success' => true,
        'summary' => [
            'active' => $active,
            'insideRadius' => $inside,
            'preparing' => $preparing,
            'releasedToday' => $releasedToday
        ],
        'requests' => $requests
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Secretaria Saída Segura GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' =>
            'Não foi possível carregar as solicitações de saída.'
    ], 500);
}

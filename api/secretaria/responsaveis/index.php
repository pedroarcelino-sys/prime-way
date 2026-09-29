<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('GET');
primewayExigirPerfis(['secretaria']);

try {
    $pdo = primewayPdo();

    $stmtAno = $pdo->query(
        "SELECT id, ano
         FROM anos_letivos
         WHERE ativo = 1
         ORDER BY ano DESC, id DESC
         LIMIT 1"
    );

    $ano = $stmtAno->fetch() ?: null;
    $anoLetivoId = $ano ? (int) $ano['id'] : 0;

    $guardians = [];

    $stmt = $pdo->query(
        "SELECT
            r.id,
            r.pessoa_id,
            r.status,
            pe.nome,
            pe.email_contato,
            pe.telefone,
            pe.documento,
            pe.data_nascimento,
            pe.ativo AS pessoa_ativa,
            u.id AS usuario_id,
            u.email AS email_acesso,
            u.ativo AS conta_ativa
         FROM responsaveis r
         INNER JOIN pessoas pe
            ON pe.id = r.pessoa_id
         LEFT JOIN usuarios u
            ON u.pessoa_id = pe.id
           AND u.perfil = 'responsavel'
         ORDER BY pe.nome ASC, r.id ASC"
    );

    foreach ($stmt->fetchAll() as $row) {
        $id = (int) $row['id'];

        $guardians[$id] = [
            'id' => $id,
            'personId' => (int) $row['pessoa_id'],
            'name' => (string) $row['nome'],
            'email' => (string) (
                $row['email_acesso']
                ?? $row['email_contato']
                ?? ''
            ),
            'phone' => (string) ($row['telefone'] ?? ''),
            'document' => (string) ($row['documento'] ?? ''),
            'birthDate' => $row['data_nascimento'],
            'status' => (string) $row['status'],
            'personActive' => (int) $row['pessoa_ativa'] === 1,
            'accountActive' =>
                $row['usuario_id'] !== null
                && (int) ($row['conta_ativa'] ?? 0) === 1,
            'links' => []
        ];
    }

    if ($guardians !== []) {
        $stmtLinks = $pdo->prepare(
            "SELECT
                ar.responsavel_id,
                ar.aluno_id,
                ar.parentesco,
                ar.autorizado_retirada,
                ar.contato_principal,
                ar.responsavel_financeiro,
                ar.ativo,
                aluno_pe.nome AS aluno_nome,
                a.matricula,
                t.nome AS turma_nome,
                t.serie,
                t.turno
             FROM aluno_responsavel ar
             INNER JOIN alunos a
                ON a.id = ar.aluno_id
             INNER JOIN pessoas aluno_pe
                ON aluno_pe.id = a.pessoa_id
             LEFT JOIN matriculas m
                ON m.aluno_id = a.id
               AND m.situacao = 'Ativa'
               AND EXISTS (
                    SELECT 1
                    FROM turmas tx
                    WHERE tx.id = m.turma_id
                      AND tx.ano_letivo_id = :ano_letivo_id
               )
             LEFT JOIN turmas t
                ON t.id = m.turma_id
             ORDER BY
                ar.responsavel_id ASC,
                ar.contato_principal DESC,
                aluno_pe.nome ASC"
        );

        $stmtLinks->execute([
            ':ano_letivo_id' => $anoLetivoId
        ]);

        foreach ($stmtLinks->fetchAll() as $row) {
            $guardianId = (int) $row['responsavel_id'];

            if (!isset($guardians[$guardianId])) {
                continue;
            }

            $guardians[$guardianId]['links'][] = [
                'studentId' => (int) $row['aluno_id'],
                'studentName' => (string) $row['aluno_nome'],
                'registration' => (string) $row['matricula'],
                'className' => (string) ($row['turma_nome'] ?? ''),
                'series' => (string) ($row['serie'] ?? ''),
                'shift' => (string) ($row['turno'] ?? ''),
                'relationship' => (string) $row['parentesco'],
                'authorizedPickup' =>
                    (int) $row['autorizado_retirada'] === 1,
                'primaryContact' =>
                    (int) $row['contato_principal'] === 1,
                'financial' =>
                    (int) $row['responsavel_financeiro'] === 1,
                'active' =>
                    (int) $row['ativo'] === 1
            ];
        }
    }

    $list = array_values($guardians);

    $summary = [
        'total' => count($list),
        'active' => 0,
        'pending' => 0,
        'activeAccounts' => 0,
        'activeLinks' => 0,
        'authorizedPickup' => 0
    ];

    foreach ($list as $guardian) {
        if ($guardian['status'] === 'ativo') {
            $summary['active']++;
        } elseif ($guardian['status'] === 'pendente') {
            $summary['pending']++;
        }

        if ($guardian['accountActive']) {
            $summary['activeAccounts']++;
        }

        foreach ($guardian['links'] as $link) {
            if ($link['active']) {
                $summary['activeLinks']++;

                if ($link['authorizedPickup']) {
                    $summary['authorizedPickup']++;
                }
            }
        }
    }

    primewayResponderJson([
        'success' => true,
        'schoolYear' => $ano
            ? [
                'id' => (int) $ano['id'],
                'year' => (int) $ano['ano']
            ]
            : null,
        'summary' => $summary,
        'guardians' => $list
    ]);

} catch (Throwable $erro) {
    error_log(
        'PrimeWay Secretaria Responsáveis GET: '
        . $erro->getMessage()
    );

    primewayResponderJson([
        'success' => false,
        'message' =>
            'Não foi possível carregar os responsáveis.'
    ], 500);
}

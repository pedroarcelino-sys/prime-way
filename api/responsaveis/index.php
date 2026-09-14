<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';

primewayExigirMetodo('GET');
primewayExigirPerfis(['admin']);

try {
    $pdo = primewayPdo();
    $responsaveis = [];

    $stmt = $pdo->query(
        "
            SELECT
                r.id, r.pessoa_id, r.status,
                pe.nome, pe.email_contato, pe.telefone, pe.documento,
                pe.data_nascimento, pe.ativo AS pessoa_ativa,
                u.email AS email_acesso, u.ativo AS conta_ativa
            FROM responsaveis r
            INNER JOIN pessoas pe ON pe.id = r.pessoa_id
            LEFT JOIN usuarios u ON u.pessoa_id = pe.id AND u.perfil = 'responsavel'
            ORDER BY pe.nome ASC, r.id ASC
        "
    );

    foreach ($stmt->fetchAll() as $row) {
        $id = (int) $row['id'];
        $responsaveis[$id] = [
            'id' => $id,
            'personId' => (int) $row['pessoa_id'],
            'name' => (string) $row['nome'],
            'email' => (string) ($row['email_acesso'] ?? $row['email_contato'] ?? ''),
            'phone' => (string) ($row['telefone'] ?? ''),
            'document' => (string) ($row['documento'] ?? ''),
            'birthDate' => $row['data_nascimento'],
            'status' => (string) $row['status'],
            'personActive' => (int) $row['pessoa_ativa'] === 1,
            'accountActive' => $row['conta_ativa'] !== null && (int) $row['conta_ativa'] === 1,
            'links' => []
        ];
    }

    if ($responsaveis !== []) {
        $links = $pdo->query(
            "
                SELECT
                    ar.responsavel_id, ar.aluno_id, ar.parentesco,
                    ar.autorizado_retirada, ar.contato_principal,
                    ar.responsavel_financeiro, ar.ativo,
                    pe.nome AS aluno_nome, a.matricula,
                    t.nome AS turma_nome
                FROM aluno_responsavel ar
                INNER JOIN alunos a ON a.id = ar.aluno_id
                INNER JOIN pessoas pe ON pe.id = a.pessoa_id
                LEFT JOIN matriculas m
                    ON m.aluno_id = a.id
                   AND m.situacao = 'Ativa'
                LEFT JOIN turmas t ON t.id = m.turma_id
                ORDER BY pe.nome ASC
            "
        );

        foreach ($links->fetchAll() as $row) {
            $responsavelId = (int) $row['responsavel_id'];
            if (!isset($responsaveis[$responsavelId])) {
                continue;
            }
            $responsaveis[$responsavelId]['links'][] = [
                'studentId' => (int) $row['aluno_id'],
                'studentName' => (string) $row['aluno_nome'],
                'registration' => (string) $row['matricula'],
                'className' => (string) ($row['turma_nome'] ?? ''),
                'relationship' => (string) $row['parentesco'],
                'authorizedPickup' => (int) $row['autorizado_retirada'] === 1,
                'primaryContact' => (int) $row['contato_principal'] === 1,
                'financial' => (int) $row['responsavel_financeiro'] === 1,
                'active' => (int) $row['ativo'] === 1
            ];
        }
    }

    primewayResponderJson([
        'success' => true,
        'guardians' => array_values($responsaveis)
    ]);
} catch (Throwable $erro) {
    error_log('PrimeWay Responsaveis GET: ' . $erro->getMessage());
    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível carregar os responsáveis.'
    ], 500);
}

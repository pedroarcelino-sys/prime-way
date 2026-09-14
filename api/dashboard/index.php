<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';

primewayExigirMetodo('GET');
primewayExigirPerfis(['admin']);

try {
    $pdo = primewayPdo();

    $contar = static function (PDO $pdo, string $sql): int {
        return (int) $pdo->query($sql)->fetchColumn();
    };

    $media = $pdo->query(
        "
            SELECT AVG((n.valor / NULLIF(a.valor_maximo, 0)) * 10)
            FROM notas n
            INNER JOIN avaliacoes a ON a.id = n.avaliacao_id
        "
    )->fetchColumn();

    $frequencia = $pdo->query(
        "
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN situacao IN ('Presente', 'Atraso') THEN 1 ELSE 0 END) AS presencas,
                SUM(CASE WHEN situacao = 'Falta' THEN 1 ELSE 0 END) AS faltas
            FROM frequencias
        "
    )->fetch();

    $totalFrequencias = (int) ($frequencia['total'] ?? 0);
    $presencas = (int) ($frequencia['presencas'] ?? 0);
    $faltas = (int) ($frequencia['faltas'] ?? 0);

    $auditoria = $pdo->query(
        "
            SELECT aud.acao, aud.entidade, aud.descricao, aud.criado_em
            FROM auditoria aud
            WHERE NOT (
                aud.entidade = 'turmas'
                AND NOT EXISTS (
                    SELECT 1 FROM turmas t WHERE t.id = aud.registro_id
                )
            )
              AND NOT (
                aud.entidade = 'alunos'
                AND NOT EXISTS (
                    SELECT 1 FROM alunos a WHERE a.id = aud.registro_id
                )
            )
              AND NOT (
                aud.entidade = 'professores'
                AND NOT EXISTS (
                    SELECT 1 FROM professores p WHERE p.id = aud.registro_id
                )
            )
              AND NOT (
                aud.entidade = 'responsaveis'
                AND NOT EXISTS (
                    SELECT 1 FROM responsaveis r WHERE r.id = aud.registro_id
                )
            )
            ORDER BY aud.criado_em DESC, aud.id DESC
            LIMIT 6
        "
    )->fetchAll();

    $eventos = $pdo->query(
        "
            SELECT
                e.titulo,
                e.tipo,
                e.data_evento,
                e.horario_inicio,
                e.horario_fim,
                e.local,
                t.nome AS turma_nome
            FROM eventos_calendario e
            LEFT JOIN turmas t ON t.id = e.turma_id
            WHERE e.status = 'Agendado'
              AND e.data_evento >= CURRENT_DATE
            ORDER BY e.data_evento ASC, e.horario_inicio ASC, e.id ASC
            LIMIT 5
        "
    )->fetchAll();

    $notificacoes = $pdo->query(
        "
            SELECT titulo, tipo, mensagem, COALESCE(publicada_em, criado_em) AS data
            FROM notificacoes
            WHERE status = 'Publicada'
            ORDER BY COALESCE(publicada_em, criado_em) DESC, id DESC
            LIMIT 5
        "
    )->fetchAll();

    $desempenho = $pdo->query(
        "
            SELECT
                al.ano,
                pl.nome,
                pl.ordem,
                AVG((n.valor / NULLIF(a.valor_maximo, 0)) * 10) AS media
            FROM anos_letivos al
            INNER JOIN periodos_letivos pl ON pl.ano_letivo_id = al.id
            LEFT JOIN avaliacoes a ON a.periodo_letivo_id = pl.id
            LEFT JOIN notas n ON n.avaliacao_id = a.id
            WHERE al.id = (
                SELECT id
                FROM anos_letivos
                WHERE ativo = 1
                ORDER BY ano DESC, id DESC
                LIMIT 1
            )
            GROUP BY al.ano, pl.id, pl.nome, pl.ordem
            ORDER BY pl.ordem ASC
        "
    )->fetchAll();

    $alunosAtencao = $contar(
        $pdo,
        "
            SELECT COUNT(*)
            FROM (
                SELECT n.matricula_id
                FROM notas n
                INNER JOIN avaliacoes a ON a.id = n.avaliacao_id
                GROUP BY n.matricula_id
                HAVING AVG((n.valor / NULLIF(a.valor_maximo, 0)) * 10) < 6
            ) medias_baixas
        "
    );

    $baixaFrequencia = $contar(
        $pdo,
        "
            SELECT COUNT(*)
            FROM (
                SELECT matricula_id
                FROM frequencias
                GROUP BY matricula_id
                HAVING (
                    SUM(CASE WHEN situacao IN ('Presente', 'Atraso') THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(*), 0)
                ) < 0.75
            ) frequencias_baixas
        "
    );

    $notasPendentes = $contar(
        $pdo,
        "
            SELECT COUNT(*)
            FROM avaliacoes a
            INNER JOIN turma_disciplinas td ON td.id = a.turma_disciplina_id
            INNER JOIN matriculas m
                ON m.turma_id = td.turma_id
               AND m.situacao = 'Ativa'
            LEFT JOIN notas n
                ON n.avaliacao_id = a.id
               AND n.matricula_id = m.id
            WHERE a.status IN ('Aplicada', 'Finalizada')
              AND n.id IS NULL
        "
    );

    primewayResponderJson([
        'success' => true,
        'summary' => [
            'students' => $contar($pdo, 'SELECT COUNT(*) FROM alunos'),
            'professors' => $contar($pdo, 'SELECT COUNT(*) FROM professores'),
            'guardians' => $contar($pdo, 'SELECT COUNT(*) FROM responsaveis'),
            'classes' => $contar($pdo, 'SELECT COUNT(*) FROM turmas'),
            'average' => $media === false || $media === null
                ? null
                : round((float) $media, 1)
        ],
        'attendance' => [
            'present' => $presencas,
            'absent' => $faltas,
            'percentage' => $totalFrequencias === 0
                ? null
                : round(($presencas / $totalFrequencias) * 100, 1)
        ],
        'academicYear' => isset($desempenho[0]['ano'])
            ? (int) $desempenho[0]['ano']
            : null,
        'performance' => array_map(
            static fn (array $row): array => [
                'label' => (string) $row['nome'],
                'order' => (int) $row['ordem'],
                'average' => $row['media'] === null
                    ? null
                    : round((float) $row['media'], 1)
            ],
            $desempenho
        ),
        'indicators' => [
            'pendingActivities' => $contar(
                $pdo,
                "SELECT COUNT(*) FROM atividades WHERE status = 'Rascunho'"
            ),
            'studentsAttention' => $alunosAtencao,
            'lowAttendance' => $baixaFrequencia,
            'pendingGrades' => $notasPendentes
        ],
        'recentActivity' => array_map(
            static fn (array $row): array => [
                'action' => (string) $row['acao'],
                'entity' => (string) ($row['entidade'] ?? ''),
                'description' => (string) ($row['descricao'] ?? ''),
                'createdAt' => (string) $row['criado_em']
            ],
            $auditoria
        ),
        'events' => array_map(
            static fn (array $row): array => [
                'title' => (string) $row['titulo'],
                'type' => (string) $row['tipo'],
                'date' => (string) $row['data_evento'],
                'startTime' => $row['horario_inicio'],
                'endTime' => $row['horario_fim'],
                'location' => (string) ($row['local'] ?? ''),
                'className' => (string) ($row['turma_nome'] ?? '')
            ],
            $eventos
        ),
        'notices' => array_map(
            static fn (array $row): array => [
                'title' => (string) $row['titulo'],
                'type' => (string) $row['tipo'],
                'message' => (string) $row['mensagem'],
                'date' => (string) $row['data']
            ],
            $notificacoes
        )
    ]);
} catch (Throwable $erro) {
    error_log('PrimeWay Dashboard GET: ' . $erro->getMessage());

    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível carregar o painel administrativo.'
    ], 500);
}

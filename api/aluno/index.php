<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';

primewayExigirMetodo('GET');
$usuario = primewayExigirPerfis(['aluno']);

try {
    $pdo = primewayPdo();

    $perfilStmt = $pdo->prepare(
        "SELECT a.id, a.matricula, a.status, a.ingresso_em,
                pe.nome, pe.email_contato, pe.telefone, pe.documento,
                pe.data_nascimento
         FROM usuarios u
         INNER JOIN pessoas pe ON pe.id = u.pessoa_id
         INNER JOIN alunos a ON a.pessoa_id = pe.id
         WHERE u.id = :usuario_id AND u.perfil = 'aluno'
         LIMIT 1"
    );
    $perfilStmt->execute(['usuario_id' => $usuario['id']]);
    $perfil = $perfilStmt->fetch();

    if (!$perfil) {
        primewayResponderJson(
            ['success' => false, 'message' => 'Conta sem cadastro de aluno vinculado.'],
            404
        );
    }

    $alunoId = (int) $perfil['id'];
    $ano = $pdo->query(
        'SELECT id, ano FROM anos_letivos WHERE ativo = 1 ORDER BY ano DESC LIMIT 1'
    )->fetch();
    $anoId = $ano ? (int) $ano['id'] : 0;

    $matricula = null;
    if ($anoId > 0) {
        $matriculaStmt = $pdo->prepare(
            "SELECT m.id, m.numero_chamada, m.data_matricula, m.situacao,
                    t.id AS turma_id, t.nome AS turma_nome, t.serie,
                    t.turno, t.sala
             FROM matriculas m
             INNER JOIN turmas t ON t.id = m.turma_id
             WHERE m.aluno_id = :aluno_id
               AND m.situacao = 'Ativa'
               AND t.ano_letivo_id = :ano_id
             ORDER BY m.id DESC
             LIMIT 1"
        );
        $matriculaStmt->execute(['aluno_id' => $alunoId, 'ano_id' => $anoId]);
        $matricula = $matriculaStmt->fetch() ?: null;
    }

    $disciplinas = [];
    $atividades = [];
    $notas = [];
    $frequencias = [];
    $eventos = [];
    $media = null;
    $frequenciaGeral = null;

    if ($matricula) {
        $turmaId = (int) $matricula['turma_id'];
        $matriculaId = (int) $matricula['id'];

        $disciplinasStmt = $pdo->prepare(
            "SELECT td.id, d.codigo, d.nome, d.area, td.carga_horaria,
                    pe.nome AS professor
             FROM turma_disciplinas td
             INNER JOIN disciplinas d ON d.id = td.disciplina_id
             INNER JOIN professores p ON p.id = td.professor_id
             INNER JOIN pessoas pe ON pe.id = p.pessoa_id
             WHERE td.turma_id = :turma_id
               AND td.status = 'Ativa'
               AND d.status = 'Ativa'
             ORDER BY d.nome"
        );
        $disciplinasStmt->execute(['turma_id' => $turmaId]);
        $disciplinas = array_map(static fn(array $row): array => [
            'id' => (int) $row['id'],
            'code' => (string) $row['codigo'],
            'name' => (string) $row['nome'],
            'area' => (string) $row['area'],
            'workload' => (int) $row['carga_horaria'],
            'teacher' => (string) $row['professor']
        ], $disciplinasStmt->fetchAll());

        $atividadesStmt = $pdo->prepare(
            "SELECT atv.id, atv.titulo, atv.descricao, atv.data_publicacao,
                    atv.data_entrega, atv.status, d.nome AS disciplina,
                    pl.nome AS periodo
             FROM atividades atv
             INNER JOIN turma_disciplinas td ON td.id = atv.turma_disciplina_id
             INNER JOIN disciplinas d ON d.id = td.disciplina_id
             INNER JOIN periodos_letivos pl ON pl.id = atv.periodo_letivo_id
             WHERE td.turma_id = :turma_id
               AND atv.status = 'Publicada'
             ORDER BY atv.data_entrega IS NULL, atv.data_entrega ASC, atv.id DESC
             LIMIT 20"
        );
        $atividadesStmt->execute(['turma_id' => $turmaId]);
        $atividades = array_map(static fn(array $row): array => [
            'id' => (int) $row['id'],
            'title' => (string) $row['titulo'],
            'description' => (string) ($row['descricao'] ?? ''),
            'publishedAt' => $row['data_publicacao'],
            'dueAt' => $row['data_entrega'],
            'status' => (string) $row['status'],
            'subject' => (string) $row['disciplina'],
            'period' => (string) $row['periodo']
        ], $atividadesStmt->fetchAll());

        $notasStmt = $pdo->prepare(
            "SELECT av.id, av.titulo, av.tipo, av.valor_maximo, av.peso,
                    av.data_avaliacao, av.status, d.nome AS disciplina,
                    pl.nome AS periodo, n.valor, n.observacao, n.lancada_em
             FROM avaliacoes av
             INNER JOIN turma_disciplinas td ON td.id = av.turma_disciplina_id
             INNER JOIN disciplinas d ON d.id = td.disciplina_id
             INNER JOIN periodos_letivos pl ON pl.id = av.periodo_letivo_id
             LEFT JOIN notas n
               ON n.avaliacao_id = av.id AND n.matricula_id = :matricula_id
             WHERE td.turma_id = :turma_id AND av.status <> 'Cancelada'
             ORDER BY av.data_avaliacao DESC, av.id DESC
             LIMIT 40"
        );
        $notasStmt->execute(['matricula_id' => $matriculaId, 'turma_id' => $turmaId]);
        $notas = array_map(static fn(array $row): array => [
            'id' => (int) $row['id'],
            'title' => (string) $row['titulo'],
            'type' => (string) $row['tipo'],
            'subject' => (string) $row['disciplina'],
            'period' => (string) $row['periodo'],
            'date' => $row['data_avaliacao'],
            'status' => (string) $row['status'],
            'value' => $row['valor'] === null ? null : (float) $row['valor'],
            'maximum' => (float) $row['valor_maximo'],
            'normalized' => $row['valor'] === null
                ? null
                : round(((float) $row['valor'] / (float) $row['valor_maximo']) * 10, 1),
            'observation' => (string) ($row['observacao'] ?? '')
        ], $notasStmt->fetchAll());

        $frequenciasStmt = $pdo->prepare(
            "SELECT d.nome AS disciplina, COUNT(f.id) AS registros,
                    SUM(CASE WHEN f.situacao IN ('Presente','Atraso') THEN 1 ELSE 0 END) AS presencas,
                    SUM(CASE WHEN f.situacao = 'Falta' THEN 1 ELSE 0 END) AS faltas,
                    SUM(CASE WHEN f.situacao = 'Justificada' THEN 1 ELSE 0 END) AS justificadas
             FROM turma_disciplinas td
             INNER JOIN disciplinas d ON d.id = td.disciplina_id
             LEFT JOIN aulas au ON au.turma_disciplina_id = td.id AND au.status = 'Realizada'
             LEFT JOIN frequencias f ON f.aula_id = au.id AND f.matricula_id = :matricula_id
             WHERE td.turma_id = :turma_id AND td.status = 'Ativa'
             GROUP BY td.id, d.nome
             ORDER BY d.nome"
        );
        $frequenciasStmt->execute(['matricula_id' => $matriculaId, 'turma_id' => $turmaId]);
        $frequencias = array_map(static function (array $row): array {
            $registros = (int) $row['registros'];
            $presencas = (int) $row['presencas'];
            return [
                'subject' => (string) $row['disciplina'],
                'records' => $registros,
                'presences' => $presencas,
                'absences' => (int) $row['faltas'],
                'justified' => (int) $row['justificadas'],
                'percentage' => $registros > 0 ? round(($presencas / $registros) * 100) : null
            ];
        }, $frequenciasStmt->fetchAll());

        $notasComValor = array_values(array_filter(
            $notas,
            static fn(array $nota): bool => $nota['normalized'] !== null
        ));
        if ($notasComValor !== []) {
            $media = round(array_sum(array_column($notasComValor, 'normalized')) / count($notasComValor), 1);
        }
        $totalRegistros = array_sum(array_column($frequencias, 'records'));
        if ($totalRegistros > 0) {
            $frequenciaGeral = round(
                (array_sum(array_column($frequencias, 'presences')) / $totalRegistros) * 100
            );
        }

        $eventosStmt = $pdo->prepare(
            "SELECT e.titulo, e.tipo, e.data_evento, e.horario_inicio,
                    e.horario_fim, e.local, e.descricao, t.nome AS turma_nome
             FROM eventos_calendario e
             LEFT JOIN turmas t ON t.id = e.turma_id
             WHERE e.status = 'Agendado'
               AND e.data_evento >= CURRENT_DATE
               AND (e.turma_id IS NULL OR e.turma_id = :turma_id)
             ORDER BY e.data_evento, e.horario_inicio
             LIMIT 12"
        );
        $eventosStmt->execute(['turma_id' => $turmaId]);
        $eventos = $eventosStmt->fetchAll();
    } else {
        $eventos = $pdo->query(
            "SELECT titulo, tipo, data_evento, horario_inicio, horario_fim,
                    local, descricao, NULL AS turma_nome
             FROM eventos_calendario
             WHERE status = 'Agendado' AND data_evento >= CURRENT_DATE
               AND turma_id IS NULL
             ORDER BY data_evento, horario_inicio
             LIMIT 12"
        )->fetchAll();
    }

    $notificacoes = $pdo->query(
        "SELECT titulo, tipo, mensagem, COALESCE(publicada_em, criado_em) AS data
         FROM notificacoes
         WHERE status = 'Publicada'
           AND LOWER(publico) IN ('todos', 'alunos', 'aluno')
         ORDER BY COALESCE(publicada_em, criado_em) DESC
         LIMIT 12"
    )->fetchAll();

    primewayResponderJson([
        'success' => true,
        'profile' => [
            'name' => (string) $perfil['nome'],
            'email' => (string) ($perfil['email_contato'] ?? $usuario['email']),
            'phone' => (string) ($perfil['telefone'] ?? ''),
            'document' => (string) ($perfil['documento'] ?? ''),
            'birthDate' => $perfil['data_nascimento'],
            'registration' => (string) $perfil['matricula'],
            'entryDate' => $perfil['ingresso_em'],
            'status' => (string) $perfil['status']
        ],
        'schoolYear' => $ano ? (int) $ano['ano'] : null,
        'enrollment' => $matricula ? [
            'id' => (int) $matricula['id'],
            'classId' => (int) $matricula['turma_id'],
            'className' => (string) $matricula['turma_nome'],
            'series' => (string) $matricula['serie'],
            'shift' => (string) $matricula['turno'],
            'room' => (string) ($matricula['sala'] ?? ''),
            'callNumber' => $matricula['numero_chamada'] === null ? null : (int) $matricula['numero_chamada'],
            'date' => (string) $matricula['data_matricula']
        ] : null,
        'summary' => [
            'average' => $media,
            'attendance' => $frequenciaGeral,
            'subjects' => count($disciplinas),
            'upcomingActivities' => count(array_filter(
                $atividades,
                static fn(array $atividade): bool =>
                    $atividade['dueAt'] === null || strtotime((string) $atividade['dueAt']) >= time()
            ))
        ],
        'subjects' => $disciplinas,
        'activities' => $atividades,
        'grades' => $notas,
        'attendance' => $frequencias,
        'events' => array_map(static fn(array $row): array => [
            'title' => (string) $row['titulo'],
            'type' => (string) $row['tipo'],
            'date' => (string) $row['data_evento'],
            'startTime' => $row['horario_inicio'],
            'endTime' => $row['horario_fim'],
            'location' => (string) ($row['local'] ?? ''),
            'description' => (string) ($row['descricao'] ?? ''),
            'className' => (string) ($row['turma_nome'] ?? '')
        ], $eventos),
        'notices' => array_map(static fn(array $row): array => [
            'title' => (string) $row['titulo'],
            'type' => (string) $row['tipo'],
            'message' => (string) $row['mensagem'],
            'date' => (string) $row['data']
        ], $notificacoes)
    ]);
} catch (Throwable $erro) {
    error_log('PrimeWay Portal Aluno GET: ' . $erro->getMessage());
    primewayResponderJson(
        ['success' => false, 'message' => 'Não foi possível carregar a área do aluno.'],
        500
    );
}

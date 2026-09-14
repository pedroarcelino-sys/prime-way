<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';

primewayExigirMetodo('GET');
$usuario = primewayExigirPerfis(['responsavel']);

try {
    $pdo = primewayPdo();
    $perfilStmt = $pdo->prepare(
        "
            SELECT r.id, r.status, pe.nome, pe.email_contato, pe.telefone,
                   pe.documento, pe.data_nascimento
            FROM usuarios u
            INNER JOIN pessoas pe ON pe.id = u.pessoa_id
            INNER JOIN responsaveis r ON r.pessoa_id = pe.id
            WHERE u.id = :usuario_id
            LIMIT 1
        "
    );
    $perfilStmt->execute(['usuario_id' => $usuario['id']]);
    $perfil = $perfilStmt->fetch();
    if (!$perfil) {
        primewayResponderJson(['success' => false, 'message' => 'Conta sem cadastro de responsável vinculado.'], 404);
    }
    $responsavelId = (int) $perfil['id'];

    $anoId = (int) $pdo->query('SELECT id FROM anos_letivos WHERE ativo=1 ORDER BY ano DESC LIMIT 1')->fetchColumn();
    $alunosStmt = $pdo->prepare(
        "
            SELECT
                a.id, a.matricula, a.status, pe.nome,
                ar.parentesco, ar.autorizado_retirada,
                ar.contato_principal, ar.responsavel_financeiro,
                t.id AS turma_id, t.nome AS turma_nome,
                (
                    SELECT ROUND(SUM((n.valor / NULLIF(av.valor_maximo,0))*10*av.peso) / NULLIF(SUM(av.peso),0),1)
                    FROM notas n INNER JOIN avaliacoes av ON av.id=n.avaliacao_id
                    WHERE n.matricula_id=m.id AND av.status <> 'Cancelada'
                ) AS media,
                (
                    SELECT ROUND(100*SUM(CASE WHEN f.situacao IN ('Presente','Atraso') THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),0)
                    FROM frequencias f INNER JOIN aulas au ON au.id=f.aula_id
                    WHERE f.matricula_id=m.id AND au.status='Realizada'
                ) AS frequencia,
                (
                    SELECT COUNT(*)
                    FROM atividades atv
                    INNER JOIN turma_disciplinas td ON td.id=atv.turma_disciplina_id
                    WHERE td.turma_id=t.id AND atv.status='Publicada'
                      AND (atv.data_entrega IS NULL OR atv.data_entrega>=CURRENT_TIMESTAMP)
                ) AS atividades
            FROM aluno_responsavel ar
            INNER JOIN alunos a ON a.id=ar.aluno_id
            INNER JOIN pessoas pe ON pe.id=a.pessoa_id
            LEFT JOIN matriculas m
                ON m.aluno_id=a.id AND m.situacao='Ativa'
               AND EXISTS (SELECT 1 FROM turmas tx WHERE tx.id=m.turma_id AND tx.ano_letivo_id=:ano_id)
            LEFT JOIN turmas t ON t.id=m.turma_id
            WHERE ar.responsavel_id=:responsavel_id AND ar.ativo=1
            ORDER BY pe.nome ASC
        "
    );
    $alunosStmt->execute(['ano_id' => $anoId, 'responsavel_id' => $responsavelId]);
    $alunos = $alunosStmt->fetchAll();

    $eventosStmt = $pdo->prepare(
        "
            SELECT DISTINCT e.titulo,e.tipo,e.data_evento,e.horario_inicio,e.local,t.nome AS turma_nome
            FROM eventos_calendario e
            LEFT JOIN turmas t ON t.id=e.turma_id
            WHERE e.status='Agendado' AND e.data_evento>=CURRENT_DATE
              AND (
                e.turma_id IS NULL OR EXISTS (
                    SELECT 1 FROM aluno_responsavel ar
                    INNER JOIN matriculas m ON m.aluno_id=ar.aluno_id AND m.situacao='Ativa'
                    WHERE ar.responsavel_id=:responsavel_id AND ar.ativo=1 AND m.turma_id=e.turma_id
                )
              )
            ORDER BY e.data_evento ASC,e.horario_inicio ASC
            LIMIT 6
        "
    );
    $eventosStmt->execute(['responsavel_id' => $responsavelId]);

    $notificacoes = $pdo->query(
        "
            SELECT titulo,tipo,mensagem,COALESCE(publicada_em,criado_em) AS data
            FROM notificacoes
            WHERE status='Publicada'
              AND LOWER(publico) IN ('todos','responsáveis','responsaveis')
            ORDER BY COALESCE(publicada_em,criado_em) DESC
            LIMIT 6
        "
    )->fetchAll();

    primewayResponderJson([
        'success' => true,
        'profile' => [
            'name' => (string) $perfil['nome'],
            'email' => (string) ($perfil['email_contato'] ?? $usuario['email']),
            'phone' => (string) ($perfil['telefone'] ?? ''),
            'document' => (string) ($perfil['documento'] ?? ''),
            'birthDate' => $perfil['data_nascimento'],
            'status' => (string) $perfil['status']
        ],
        'students' => array_map(static fn(array $row): array => [
            'id' => (int) $row['id'], 'name' => (string) $row['nome'],
            'registration' => (string) $row['matricula'], 'status' => (string) $row['status'],
            'relationship' => (string) $row['parentesco'],
            'authorizedPickup' => (int) $row['autorizado_retirada'] === 1,
            'primaryContact' => (int) $row['contato_principal'] === 1,
            'financial' => (int) $row['responsavel_financeiro'] === 1,
            'className' => (string) ($row['turma_nome'] ?? ''),
            'average' => $row['media'] === null ? null : (float) $row['media'],
            'attendance' => $row['frequencia'] === null ? null : (int) $row['frequencia'],
            'upcomingActivities' => (int) $row['atividades']
        ], $alunos),
        'events' => array_map(static fn(array $row): array => [
            'title' => (string) $row['titulo'], 'type' => (string) $row['tipo'],
            'date' => (string) $row['data_evento'], 'time' => $row['horario_inicio'],
            'location' => (string) ($row['local'] ?? ''), 'className' => (string) ($row['turma_nome'] ?? '')
        ], $eventosStmt->fetchAll()),
        'notices' => array_map(static fn(array $row): array => [
            'title' => (string) $row['titulo'], 'type' => (string) $row['tipo'],
            'message' => (string) $row['mensagem'], 'date' => (string) $row['data']
        ], $notificacoes)
    ]);
} catch (Throwable $erro) {
    error_log('PrimeWay Portal Responsavel GET: ' . $erro->getMessage());
    primewayResponderJson(['success' => false, 'message' => 'Não foi possível carregar a área do responsável.'], 500);
}

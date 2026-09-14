<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';

primewayExigirMetodo('GET');
$usuario = primewayExigirPerfis(['professor']);

try {
    $pdo = primewayPdo();

    $perfilStmt = $pdo->prepare(
        "
            SELECT
                pr.id,
                pr.registro_funcional,
                pr.status,
                pr.admissao_em,
                pe.nome,
                pe.email_contato,
                pe.telefone,
                pe.documento,
                pe.data_nascimento
            FROM usuarios u
            INNER JOIN pessoas pe ON pe.id = u.pessoa_id
            INNER JOIN professores pr ON pr.pessoa_id = pe.id
            WHERE u.id = :usuario_id
            LIMIT 1
        "
    );
    $perfilStmt->execute(['usuario_id' => $usuario['id']]);
    $perfil = $perfilStmt->fetch();

    if (!$perfil) {
        primewayResponderJson([
            'success' => false,
            'message' => 'Esta conta ainda não está vinculada a um cadastro de professor.'
        ], 404);
    }

    $professorId = (int) $perfil['id'];

    $turmasStmt = $pdo->prepare(
        "
            SELECT
                t.id,
                t.nome,
                t.serie,
                t.turno,
                t.sala,
                COUNT(DISTINCT CASE WHEN m.situacao = 'Ativa' THEN m.id END) AS alunos,
                GROUP_CONCAT(DISTINCT d.nome ORDER BY d.nome SEPARATOR ', ') AS disciplinas
            FROM turmas t
            LEFT JOIN matriculas m ON m.turma_id = t.id
            LEFT JOIN turma_disciplinas td
                ON td.turma_id = t.id
               AND td.professor_id = :professor_disciplina
               AND td.status = 'Ativa'
            LEFT JOIN disciplinas d ON d.id = td.disciplina_id
            WHERE t.professor_id = :professor_regente
               OR td.professor_id = :professor_filtro
            GROUP BY t.id, t.nome, t.serie, t.turno, t.sala
            ORDER BY t.nome ASC
        "
    );
    $turmasStmt->execute([
        'professor_disciplina' => $professorId,
        'professor_regente' => $professorId,
        'professor_filtro' => $professorId
    ]);
    $turmas = $turmasStmt->fetchAll();

    $alunosStmt = $pdo->prepare(
        "
            SELECT DISTINCT
                a.id,
                pe.nome,
                a.matricula,
                t.nome AS turma
            FROM turmas t
            INNER JOIN matriculas m
                ON m.turma_id = t.id
               AND m.situacao = 'Ativa'
            INNER JOIN alunos a ON a.id = m.aluno_id
            INNER JOIN pessoas pe ON pe.id = a.pessoa_id
            LEFT JOIN turma_disciplinas td
                ON td.turma_id = t.id
               AND td.professor_id = :professor_disciplina
               AND td.status = 'Ativa'
            WHERE t.professor_id = :professor_regente
               OR td.professor_id = :professor_filtro
            ORDER BY pe.nome ASC
        "
    );
    $alunosStmt->execute([
        'professor_disciplina' => $professorId,
        'professor_regente' => $professorId,
        'professor_filtro' => $professorId
    ]);
    $alunos = $alunosStmt->fetchAll();

    $disciplinasStmt = $pdo->prepare(
        "
            SELECT COUNT(DISTINCT disciplina_id)
            FROM turma_disciplinas
            WHERE professor_id = :professor_id
              AND status = 'Ativa'
        "
    );
    $disciplinasStmt->execute(['professor_id' => $professorId]);

    $atividadesStmt = $pdo->prepare(
        "
            SELECT COUNT(*)
            FROM atividades a
            INNER JOIN turma_disciplinas td ON td.id = a.turma_disciplina_id
            WHERE td.professor_id = :professor_id
              AND a.status = 'Publicada'
              AND (a.data_entrega IS NULL OR a.data_entrega >= CURRENT_TIMESTAMP)
        "
    );
    $atividadesStmt->execute(['professor_id' => $professorId]);

    primewayResponderJson([
        'success' => true,
        'profile' => [
            'name' => (string) $perfil['nome'],
            'email' => (string) ($perfil['email_contato'] ?? $usuario['email']),
            'phone' => (string) ($perfil['telefone'] ?? ''),
            'document' => (string) ($perfil['documento'] ?? ''),
            'birthDate' => $perfil['data_nascimento'],
            'registration' => (string) ($perfil['registro_funcional'] ?? ''),
            'status' => (string) $perfil['status'],
            'admissionDate' => $perfil['admissao_em'],
            'contract' => null
        ],
        'summary' => [
            'classes' => count($turmas),
            'students' => count($alunos),
            'subjects' => (int) $disciplinasStmt->fetchColumn(),
            'upcomingActivities' => (int) $atividadesStmt->fetchColumn()
        ],
        'classes' => array_map(
            static fn (array $row): array => [
                'id' => (int) $row['id'],
                'name' => (string) $row['nome'],
                'grade' => (string) $row['serie'],
                'shift' => (string) $row['turno'],
                'room' => (string) ($row['sala'] ?? ''),
                'students' => (int) $row['alunos'],
                'subjects' => (string) ($row['disciplinas'] ?? '')
            ],
            $turmas
        ),
        'students' => array_map(
            static fn (array $row): array => [
                'id' => (int) $row['id'],
                'name' => (string) $row['nome'],
                'registration' => (string) $row['matricula'],
                'className' => (string) $row['turma']
            ],
            $alunos
        )
    ]);
} catch (Throwable $erro) {
    error_log('PrimeWay Portal Professor GET: ' . $erro->getMessage());
    primewayResponderJson([
        'success' => false,
        'message' => 'Não foi possível carregar a área do professor.'
    ], 500);
}

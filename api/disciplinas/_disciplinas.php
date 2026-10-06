<?php

declare(strict_types=1);

final class PrimewayDisciplinaErro extends RuntimeException {}

function primewayDisciplinaErro(string $message, int $status = 422): never
{
    throw new PrimewayDisciplinaErro($message, $status);
}

function primewayDisciplinaId(mixed $value, bool $optional = false): ?int
{
    if ($optional && ($value === null || $value === '')) return null;
    if ((!is_int($value) && !is_string($value)) || !preg_match('/^[1-9][0-9]*$/D', (string)$value)
        || filter_var($value, FILTER_VALIDATE_INT) === false) {
        primewayDisciplinaErro('Identificador inválido.');
    }
    return (int)$value;
}

function primewayDisciplinaStatus(mixed $value): string
{
    if (!in_array($value, ['Ativa', 'Inativa'], true)) primewayDisciplinaErro('Status inválido.');
    return $value;
}

function primewayDisciplinaTexto(mixed $value, int $max, string $label): string
{
    if (!is_string($value) || trim($value) === '' || mb_strlen(trim($value)) > $max) {
        primewayDisciplinaErro("Informe $label válido (até $max caracteres).");
    }
    return trim($value);
}

function primewayDisciplinaLinha(PDO $pdo, string $table, int $id): array
{
    // Nomes de tabela internos; nunca recebidos diretamente do cliente.
    if (!in_array($table, ['disciplinas', 'turma_disciplinas', 'turmas'], true)) throw new LogicException('Tabela inválida');
    $stmt = $pdo->prepare("SELECT * FROM $table WHERE id = :id FOR UPDATE");
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) primewayDisciplinaErro('Registro não encontrado.', 404);
    return $row;
}

function primewayDisciplinaDependencias(PDO $pdo, int $id): array
{
    // Notas, entregas, anexos e frequências dependem destes registros por FK.
    $result = [];
    foreach (['atividades', 'avaliacoes', 'aulas'] as $table) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM $table WHERE turma_disciplina_id = :id");
        $stmt->execute(['id' => $id]);
        $result[$table] = (int)$stmt->fetchColumn();
    }
    return $result;
}

function primewayDisciplinasListar(PDO $pdo): array
{
    $stmt = $pdo->prepare('SELECT id, codigo, nome, area, status FROM disciplinas ORDER BY nome, id');
    $stmt->execute();
    $subjects = [];
    foreach ($stmt->fetchAll() as $row) {
        $subjects[(int)$row['id']] = ['id' => (int)$row['id'], 'code' => $row['codigo'],
            'name' => $row['nome'], 'area' => $row['area'], 'status' => $row['status'], 'links' => []];
    }
    $stmt = $pdo->prepare("SELECT td.*, t.nome AS turma_nome, t.status AS turma_status,
        al.ano, pe.nome AS professor_nome, p.status AS professor_status, pe.ativo AS pessoa_ativa,
        (SELECT COUNT(*) FROM atividades a WHERE a.turma_disciplina_id = td.id) AS atividades,
        (SELECT COUNT(*) FROM avaliacoes a WHERE a.turma_disciplina_id = td.id) AS avaliacoes,
        (SELECT COUNT(*) FROM aulas a WHERE a.turma_disciplina_id = td.id) AS aulas
        FROM turma_disciplinas td
        INNER JOIN turmas t ON t.id = td.turma_id
        INNER JOIN anos_letivos al ON al.id = t.ano_letivo_id
        INNER JOIN professores p ON p.id = td.professor_id
        INNER JOIN pessoas pe ON pe.id = p.pessoa_id
        ORDER BY al.ano DESC, t.nome, td.id");
    $stmt->execute();
    foreach ($stmt->fetchAll() as $row) {
        $subjects[(int)$row['disciplina_id']]['links'][] = [
            'id' => (int)$row['id'], 'disciplinaId' => (int)$row['disciplina_id'],
            'turmaId' => (int)$row['turma_id'], 'professorId' => (int)$row['professor_id'],
            'className' => $row['turma_nome'], 'schoolYear' => (int)$row['ano'],
            'classStatus' => $row['turma_status'], 'teacher' => $row['professor_nome'],
            'teacherAvailable' => $row['professor_status'] === 'ativo' && (int)$row['pessoa_ativa'] === 1,
            'hours' => (int)$row['carga_horaria'], 'status' => $row['status'],
            'hasHistory' => (int)$row['atividades'] + (int)$row['avaliacoes'] + (int)$row['aulas'] > 0
        ];
    }
    return array_values($subjects);
}

// Escritas chamadas dentro da transação da rota (ou transação revertida dos testes).
function primewayDisciplinaSalvar(PDO $pdo, array $data): int
{
    $id = primewayDisciplinaId($data['id'] ?? null, true);
    $name = primewayDisciplinaTexto($data['name'] ?? null, 100, 'um nome');
    $code = mb_strtoupper(primewayDisciplinaTexto($data['code'] ?? null, 20, 'um código'));
    if (preg_match('/\s/u', $code)) primewayDisciplinaErro('O código não pode conter espaços.');
    $area = primewayDisciplinaTexto($data['area'] ?? null, 60, 'uma área');
    if (!in_array($area, ['Linguagens', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas', 'Artes', 'Tecnologia'], true)) {
        primewayDisciplinaErro('Área de conhecimento inválida.');
    }
    $status = primewayDisciplinaStatus($data['status'] ?? null);
    if ($id !== null) primewayDisciplinaLinha($pdo, 'disciplinas', $id);
    $stmt = $pdo->prepare('SELECT id FROM disciplinas WHERE codigo = :code AND id <> :id');
    $stmt->execute(['code' => $code, 'id' => $id ?? 0]);
    if ($stmt->fetch()) primewayDisciplinaErro('Já existe uma disciplina com este código.', 409);
    $params = ['name' => $name, 'code' => $code, 'area' => $area, 'status' => $status];
    if ($id === null) {
        $stmt = $pdo->prepare('INSERT INTO disciplinas (nome, codigo, area, status) VALUES (:name, :code, :area, :status)');
    } else {
        $stmt = $pdo->prepare('UPDATE disciplinas SET nome = :name, codigo = :code, area = :area, status = :status WHERE id = :id');
        $params['id'] = $id;
    }
    $stmt->execute($params);
    return $id ?? (int)$pdo->lastInsertId();
}

function primewayDisciplinaSalvarVinculo(PDO $pdo, array $data): int
{
    $id = primewayDisciplinaId($data['id'] ?? null, true);
    $subjectId = primewayDisciplinaId($data['disciplinaId'] ?? null);
    $classId = primewayDisciplinaId($data['turmaId'] ?? null);
    $teacherId = primewayDisciplinaId($data['professorId'] ?? null);
    $hours = primewayDisciplinaId($data['hours'] ?? null);
    if ($hours > 1000) primewayDisciplinaErro('A carga horária deve ser inteira, de 1 a 1000 horas.');
    $status = primewayDisciplinaStatus($data['status'] ?? null);
    $old = $id === null ? null : primewayDisciplinaLinha($pdo, 'turma_disciplinas', $id);
    $structural = $old !== null && ((int)$old['disciplina_id'] !== $subjectId
        || (int)$old['turma_id'] !== $classId || (int)$old['professor_id'] !== $teacherId);
    if ($structural && array_sum(primewayDisciplinaDependencias($pdo, $id)) > 0) {
        primewayDisciplinaErro('Este vínculo possui histórico acadêmico. Não é permitido trocar turma, disciplina ou professor. O histórico será preservado.', 409);
    }
    $subject = primewayDisciplinaLinha($pdo, 'disciplinas', $subjectId);
    $class = primewayDisciplinaLinha($pdo, 'turmas', $classId);
    $stmt = $pdo->prepare('SELECT p.status, pe.ativo FROM professores p INNER JOIN pessoas pe ON pe.id = p.pessoa_id WHERE p.id = :id FOR UPDATE');
    $stmt->execute(['id' => $teacherId]);
    $teacher = $stmt->fetch();
    if (!$teacher) primewayDisciplinaErro('Professor não encontrado.', 404);
    if ($old === null || $structural || ($old['status'] === 'Inativa' && $status === 'Ativa')) {
        if ($subject['status'] !== 'Ativa') primewayDisciplinaErro('Ative a disciplina antes de criar, alterar a atribuição ou reativar o vínculo.', 409);
        if ($class['status'] !== 'Ativa') primewayDisciplinaErro('A turma está inativa e não pode receber esta atribuição.', 409);
        if ($teacher['status'] !== 'ativo' || (int)$teacher['ativo'] !== 1) primewayDisciplinaErro('O professor está inativo ou indisponível.', 409);
    }
    $stmt = $pdo->prepare('SELECT id FROM turma_disciplinas WHERE turma_id = :class AND disciplina_id = :subject AND id <> :id');
    $stmt->execute(['class' => $classId, 'subject' => $subjectId, 'id' => $id ?? 0]);
    if ($stmt->fetch()) primewayDisciplinaErro('Esta disciplina já possui vínculo com a turma. Edite ou reative o vínculo existente.', 409);
    $params = ['class' => $classId, 'subject' => $subjectId, 'teacher' => $teacherId, 'hours' => $hours, 'status' => $status];
    if ($id === null) {
        $stmt = $pdo->prepare('INSERT INTO turma_disciplinas (turma_id, disciplina_id, professor_id, carga_horaria, status) VALUES (:class, :subject, :teacher, :hours, :status)');
    } else {
        $stmt = $pdo->prepare('UPDATE turma_disciplinas SET turma_id = :class, disciplina_id = :subject, professor_id = :teacher, carga_horaria = :hours, status = :status WHERE id = :id');
        $params['id'] = $id;
    }
    $stmt->execute($params);
    return $id ?? (int)$pdo->lastInsertId();
}

function primewayDisciplinaAlterarStatus(PDO $pdo, array $data): int
{
    $id = primewayDisciplinaId($data['id'] ?? null);
    $status = primewayDisciplinaStatus($data['status'] ?? null);
    if (($data['target'] ?? '') === 'disciplina') {
        primewayDisciplinaLinha($pdo, 'disciplinas', $id);
        $stmt = $pdo->prepare('UPDATE disciplinas SET status = :status WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);
    } elseif (($data['target'] ?? '') === 'vinculo') {
        $row = primewayDisciplinaLinha($pdo, 'turma_disciplinas', $id);
        primewayDisciplinaSalvarVinculo($pdo, ['id' => $id, 'disciplinaId' => (int)$row['disciplina_id'],
            'turmaId' => (int)$row['turma_id'], 'professorId' => (int)$row['professor_id'],
            'hours' => (int)$row['carga_horaria'], 'status' => $status]);
    } else {
        primewayDisciplinaErro('Informe se deseja alterar a disciplina ou o vínculo.');
    }
    return $id;
}

function primewayDisciplinaResponderErro(Throwable $error, ?PDO $pdo = null): never
{
    if ($pdo?->inTransaction()) $pdo->rollBack();
    if ($error instanceof PrimewayDisciplinaErro) {
        primewayResponderJson(['success' => false, 'message' => $error->getMessage()], $error->getCode());
    }
    if ($error instanceof PDOException && (string)$error->getCode() === '23000') {
        primewayResponderJson(['success' => false, 'message' => 'Código ou vínculo já cadastrado, ou referência inválida. Atualize a página e confira os dados.'], 409);
    }
    error_log('PrimeWay Disciplinas: ' . $error->getMessage());
    primewayResponderJson(['success' => false, 'message' => 'Não foi possível processar a disciplina.'], 500);
}

<?php
declare(strict_types=1);

// Escritas de teste no MySQL local, SEM COMMIT; exige opção explícita.
// AUTO_INCREMENT pode avançar mesmo após rollback. Nenhum usuário é criado.
if (PHP_SAPI !== 'cli' || !in_array('--rollback', $argv, true)) {
    exit("Uso: php tests/integration/disciplinas_relacional.php --rollback\n");
}
require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/api/disciplinas/_disciplinas.php';
$pdo = primewayPdo();
$total = 0;
function check(bool $ok, string $message): void {
    global $total;
    if (!$ok) throw new RuntimeException($message);
    $total++;
    echo "[OK] $message\n";
}
function rejects(callable $action, int $status, string $message): void {
    try { $action(); } catch (PrimewayDisciplinaErro $e) { check($e->getCode() === $status, $message); return; }
    throw new RuntimeException('Aceitou operação inválida: ' . $message);
}
function snapshot(PDO $pdo): string {
    $data = [];
    foreach (['disciplinas','turma_disciplinas','turmas','professores','atividades','avaliacoes','notas','aulas','frequencias'] as $table) {
        $data[$table] = $pdo->query("SELECT * FROM $table ORDER BY id")->fetchAll();
    }
    $data['peopleStatus'] = $pdo->query('SELECT id, ativo FROM pessoas ORDER BY id')->fetchAll();
    return hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));
}
$before = snapshot($pdo);
$pdo->beginTransaction();
try {
    $initial = primewayDisciplinasListar($pdo);
    check(count($initial) === 5, 'cinco disciplinas existentes retornadas');
    check(count(array_filter($initial, fn($s) => count($s['links']) > 0)) === 1, 'disciplina vinculada identificada');
    check(count(array_filter($initial, fn($s) => $s['links'] === [])) === 4, 'quatro disciplinas sem vínculo preservadas');
    $classes = $pdo->query("SELECT id FROM turmas WHERE status = 'Ativa' ORDER BY id")->fetchAll(PDO::FETCH_COLUMN);
    $teachers = $pdo->query("SELECT p.id, p.pessoa_id FROM professores p JOIN pessoas pe ON pe.id=p.pessoa_id WHERE p.status='ativo' AND pe.ativo=1 ORDER BY p.id")->fetchAll();
    if (count($classes) < 2 || count($teachers) < 2) throw new RuntimeException('São necessários dois professores e duas turmas existentes ativos.');
    $identity = ['code' => 'T' . strtoupper(bin2hex(random_bytes(5))), 'name' => 'Teste relacional (rollback)', 'area' => 'Tecnologia', 'status' => 'Ativa'];
    $id = primewayDisciplinaSalvar($pdo, $identity);
    check($id > 0, 'criação usa ID do MySQL');
    rejects(fn() => primewayDisciplinaSalvar($pdo, [...$identity, 'code' => strtolower($identity['code'])]), 409, 'código global duplicado rejeitado');
    foreach ([['name' => ''], ['code' => str_repeat('x',21)], ['code' => 'A B'], ['area' => 'inexistente'], ['status' => 'ativo']] as $invalid) {
        rejects(fn() => primewayDisciplinaSalvar($pdo, [...$identity, ...$invalid]), 422, 'identidade inválida rejeitada: ' . array_key_first($invalid));
    }
    primewayDisciplinaSalvar($pdo, [...$identity, 'id' => $id, 'name' => 'Nome editado']);
    check(primewayDisciplinaLinha($pdo, 'disciplinas', $id)['nome'] === 'Nome editado', 'edição mantém identidade');
    $link = ['disciplinaId' => $id, 'turmaId' => (int)$classes[0], 'professorId' => (int)$teachers[0]['id'], 'hours' => 100, 'status' => 'Ativa'];
    $linkId = primewayDisciplinaSalvarVinculo($pdo, $link);
    check($linkId > 0, 'vínculo criado por IDs existentes');
    rejects(fn() => primewayDisciplinaSalvarVinculo($pdo, $link), 409, 'turma e disciplina duplicadas rejeitadas');
    foreach ([0, -1, 1001, 1.5, '1.5', true, [], null] as $hours) {
        rejects(fn() => primewayDisciplinaSalvarVinculo($pdo, [...$link, 'hours' => $hours]), 422, 'carga horária inválida rejeitada: ' . json_encode($hours));
    }
    foreach (['turmaId', 'professorId', 'disciplinaId'] as $field) {
        rejects(fn() => primewayDisciplinaSalvarVinculo($pdo, [...$link, $field => 2147483647]), 404, $field . ' inexistente rejeitado');
    }
    $newLink = [...$link, 'turmaId' => (int)$classes[1]];
    $stmt = $pdo->prepare("UPDATE turmas SET status='Inativa' WHERE id=?"); $stmt->execute([$classes[1]]);
    rejects(fn() => primewayDisciplinaSalvarVinculo($pdo, $newLink), 409, 'turma inativa rejeitada');
    $pdo->prepare("UPDATE turmas SET status='Ativa' WHERE id=?")->execute([$classes[1]]);
    $pdo->prepare("UPDATE professores SET status='inativo' WHERE id=?")->execute([$teachers[0]['id']]);
    rejects(fn() => primewayDisciplinaSalvarVinculo($pdo, $newLink), 409, 'professor inativo rejeitado');
    $pdo->prepare("UPDATE professores SET status='ativo' WHERE id=?")->execute([$teachers[0]['id']]);
    $pdo->prepare('UPDATE pessoas SET ativo=0 WHERE id=?')->execute([$teachers[0]['pessoa_id']]);
    rejects(fn() => primewayDisciplinaSalvarVinculo($pdo, $newLink), 409, 'pessoa do professor indisponível rejeitada');
    $pdo->prepare('UPDATE pessoas SET ativo=1 WHERE id=?')->execute([$teachers[0]['pessoa_id']]);
    primewayDisciplinaAlterarStatus($pdo, ['target'=>'disciplina','id'=>$id,'status'=>'Inativa']);
    rejects(fn() => primewayDisciplinaSalvarVinculo($pdo, $newLink), 409, 'disciplina inativa não recebe novo vínculo');
    check(primewayDisciplinaLinha($pdo,'turma_disciplinas',$linkId)['status'] === 'Ativa', 'inativar disciplina não apaga nem reescreve vínculo');
    primewayDisciplinaAlterarStatus($pdo, ['target'=>'vinculo','id'=>$linkId,'status'=>'Inativa']);
    rejects(fn() => primewayDisciplinaAlterarStatus($pdo, ['target'=>'vinculo','id'=>$linkId,'status'=>'Ativa']),409,'reativação exige disciplina ativa');
    primewayDisciplinaAlterarStatus($pdo, ['target'=>'disciplina','id'=>$id,'status'=>'Ativa']);
    $pdo->prepare("UPDATE professores SET status='inativo' WHERE id=?")->execute([$teachers[0]['id']]);
    rejects(fn() => primewayDisciplinaAlterarStatus($pdo, ['target'=>'vinculo','id'=>$linkId,'status'=>'Ativa']),409,'reativação exige professor disponível');
    $pdo->prepare("UPDATE professores SET status='ativo' WHERE id=?")->execute([$teachers[0]['id']]);
    primewayDisciplinaAlterarStatus($pdo, ['target'=>'vinculo','id'=>$linkId,'status'=>'Ativa']);
    check(primewayDisciplinaLinha($pdo,'turma_disciplinas',$linkId)['status'] === 'Ativa', 'reativação validada');
    primewayDisciplinaSalvarVinculo($pdo, [...$newLink,'id'=>$linkId,'professorId'=>(int)$teachers[1]['id']]);
    check((int)primewayDisciplinaLinha($pdo,'turma_disciplinas',$linkId)['turma_id'] === (int)$classes[1], 'vínculo sem histórico permite alteração estrutural');
    $historical = null;
    foreach ($initial as $subject) foreach ($subject['links'] as $row) if ($row['hasHistory']) $historical = $row;
    if (!$historical) throw new RuntimeException('Vínculo histórico necessário para este teste.');
    $counts = primewayDisciplinaDependencias($pdo, $historical['id']);
    foreach (['disciplinaId'=>$id, 'turmaId'=>(int)array_values(array_diff($classes,[$historical['turmaId']]))[0], 'professorId'=>(int)array_values(array_diff(array_column($teachers,'id'),[$historical['professorId']]))[0]] as $field=>$value) {
        rejects(fn() => primewayDisciplinaSalvarVinculo($pdo,[...$historical,$field=>$value]),409,'histórico bloqueia troca de '.$field);
    }
    primewayDisciplinaAlterarStatus($pdo,['target'=>'vinculo','id'=>$historical['id'],'status'=>'Inativa']);
    primewayDisciplinaAlterarStatus($pdo,['target'=>'disciplina','id'=>$historical['disciplinaId'],'status'=>'Inativa']);
    check(primewayDisciplinaDependencias($pdo,$historical['id']) === $counts, 'inativação preserva todas as dependências');
    $listed = array_values(array_filter(primewayDisciplinasListar($pdo),fn($s)=>$s['id']===$historical['disciplinaId']))[0];
    check($listed['links'][0]['hasHistory'] && $listed['links'][0]['status']==='Inativa', 'consulta mantém vínculo histórico inativo');
} finally {
    $pdo->rollBack();
}
check(snapshot($pdo) === $before, 'rollback confirmou dados acadêmicos originais preservados');
echo "$total verificações aprovadas; transação revertida.\n";

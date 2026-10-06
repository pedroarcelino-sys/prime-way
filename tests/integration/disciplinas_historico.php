<?php
declare(strict_types=1);

// Executa o SQL das rotas reais, não cópias das consultas. Sem COMMIT.
if (PHP_SAPI !== 'cli' || !in_array('--rollback', $argv, true)) {
    exit("Uso: php tests/integration/disciplinas_historico.php --rollback\n");
}
require_once dirname(__DIR__, 2) . '/config/database.php';
$pdo = primewayPdo();
$root = dirname(__DIR__, 2);
$total = 0;
function checkHistory(bool $ok, string $message): void {
    global $total;
    if (!$ok) throw new RuntimeException($message);
    echo '[OK] ' . $message . "\n"; $total++;
}
function routeSql(string $file, string $marker): string {
    global $root;
    foreach (token_get_all(file_get_contents($root . '/' . $file)) as $token) {
        if (!is_array($token) || $token[0] !== T_CONSTANT_ENCAPSED_STRING) continue;
        $sql = stripcslashes(substr($token[1], 1, -1));
        if (str_contains(preg_replace('/\s+/', ' ', $sql), $marker)) return $sql;
    }
    throw new RuntimeException('SQL não encontrado: ' . $file . ' / ' . $marker);
}
function rows(PDO $pdo, string $sql, array $params): array {
    preg_match_all('/:([a-z_]+)/', $sql, $matches);
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_intersect_key($params, array_flip($matches[1])));
    return $stmt->fetchAll();
}
$link = $pdo->query('SELECT td.*, t.ano_letivo_id FROM turma_disciplinas td JOIN turmas t ON t.id=td.turma_id
    WHERE EXISTS (SELECT 1 FROM atividades a WHERE a.turma_disciplina_id=td.id)
    AND EXISTS (SELECT 1 FROM aulas a WHERE a.turma_disciplina_id=td.id)
    AND EXISTS (SELECT 1 FROM avaliacoes a WHERE a.turma_disciplina_id=td.id) LIMIT 1')->fetch();
if (!$link) throw new RuntimeException('Necessário vínculo existente com atividade, avaliação e aula.');
$params = ['turma_id'=>$link['turma_id'], 'professor_id'=>$link['professor_id'], 'ano_letivo_id'=>$link['ano_letivo_id'],
    'professor_regente_flag'=>$link['professor_id'], 'professor_disciplina'=>$link['professor_id'],
    'professor_regente'=>$link['professor_id'], 'professor_filtro'=>$link['professor_id'], 'turma_disciplina_id'=>$link['id']];
foreach (['atividades'=>'atividade_id','avaliacoes'=>'avaliacao_id','aulas'=>'aula_id'] as $table=>$key) {
    $stmt=$pdo->prepare("SELECT id FROM $table WHERE turma_disciplina_id=? ORDER BY id LIMIT 1");
    $stmt->execute([$link['id']]); $params[$key]=(int)$stmt->fetchColumn();
}
$stmt=$pdo->prepare("SELECT id FROM matriculas WHERE turma_id=? AND situacao='Ativa' ORDER BY id LIMIT 1");
$stmt->execute([$link['turma_id']]); $params['matricula_id']=$params['matricula_id_nota']=(int)$stmt->fetchColumn();
$cases = [
    ['api/aluno/frequencia/index.php','FROM turma_disciplinas td'],
    ['api/responsavel/frequencia/index.php','FROM turma_disciplinas td'],
    ['api/aluno/index.php','COUNT(f.id) AS registros'],
    ['api/aluno/atividades/index.php','FROM atividades atv'],
    ['api/aluno/atividades/visualizar.php','FROM atividades atv'],
    ['api/aluno/atividades/_atividade.php','FROM atividades atv'],
    ['api/professor/notas/index.php','AS disponivel'],
    ['api/professor/notas/index.php','FROM turma_disciplinas td INNER JOIN turmas t ON t.id = td.turma_id INNER JOIN matriculas'],
    ['api/professor/notas/index.php','FROM avaliacoes av'],
    ['api/professor/notas/index.php','FROM notas n'],
    ['api/professor/frequencia/index.php','AS disponivel'],
    ['api/professor/frequencia/index.php','FROM turma_disciplinas td INNER JOIN turmas t ON t.id = td.turma_id INNER JOIN matriculas'],
    ['api/professor/frequencia/index.php','FROM aulas au'],
    ['api/professor/frequencia/index.php','FROM frequencias f INNER JOIN aulas au'],
    ['api/professor/turmas/index.php','FROM turmas t'],
];
$baseline=[];
foreach ($cases as [$file,$marker]) {
    $sql=routeSql($file,$marker); $data=rows($pdo,$sql,$params);
    checkHistory(count($data)>0, "consulta ativa retorna histórico: $file / $marker");
    $baseline[]=[$file,$sql,$data];
}
function normalizeHistory(array $data): array {
    foreach ($data as &$row) unset($row['disponivel'],$row['vinculo_status'],$row['disciplina_status']);
    return $data;
}
$before=$pdo->query('SELECT id,status FROM disciplinas ORDER BY id')->fetchAll();
$deliveriesBefore=$pdo->query('SELECT * FROM entregas_atividades ORDER BY id')->fetchAll();
$pdo->beginTransaction();
try {
    $stmt=$pdo->prepare('SELECT id FROM entregas_atividades WHERE atividade_id=? AND matricula_id=?');
    $stmt->execute([$params['atividade_id'],$params['matricula_id']]);
    $params['entrega_id']=(int)$stmt->fetchColumn();
    if(!$params['entrega_id']) {
        $pdo->prepare("INSERT INTO entregas_atividades (atividade_id,matricula_id,status) VALUES (?,?,'Entregue')")
            ->execute([$params['atividade_id'],$params['matricula_id']]);
        $params['entrega_id']=(int)$pdo->lastInsertId();
    }
    $correctionSql=routeSql('api/professor/atividades/corrigir.php','FROM entregas_atividades ea');
    checkHistory(count(rows($pdo,$correctionSql,$params))===1,'correção encontra entrega com vínculo ativo');
    // A entrega temporária também participa dos contadores das consultas de histórico.
    foreach ($baseline as &$case) $case[2]=rows($pdo,$case[1],$params);
    unset($case);
    // Disciplina e vínculo inativos são cenários independentes.
    foreach (['disciplinas'=>$link['disciplina_id'],'turma_disciplinas'=>$link['id']] as $table=>$id) {
        $pdo->prepare("UPDATE $table SET status='Inativa' WHERE id=?")->execute([$id]);
        foreach ($baseline as [$file,$sql,$expected]) {
            $actual=rows($pdo,$sql,$params);
            checkHistory(normalizeHistory($actual)===normalizeHistory($expected), "$table inativa preserva resultado: $file");
            if (str_contains($sql,'AS disponivel')) checkHistory(!(bool)$actual[0]['disponivel'], 'opção histórica não permite novo lançamento');
        }
        foreach (['api/professor/notas/salvar_notas.php'=>'FROM avaliacoes av',
            'api/professor/frequencia/salvar_aula.php'=>'FROM turma_disciplinas td',
            'api/professor/atividades/corrigir.php'=>'FROM entregas_atividades ea',
            'api/professor/frequencia/salvar_frequencia.php'=>'FROM aulas au'] as $file=>$marker) {
            checkHistory(rows($pdo,routeSql($file,$marker),$params)===[], "$table inativa bloqueia escrita: $file");
        }
        $pdo->prepare("UPDATE $table SET status='Ativa' WHERE id=?")->execute([$id]);
    }
} finally { $pdo->rollBack(); }
checkHistory($before===$pdo->query('SELECT id,status FROM disciplinas ORDER BY id')->fetchAll(), 'status originais preservados por rollback');
checkHistory($deliveriesBefore===$pdo->query('SELECT * FROM entregas_atividades ORDER BY id')->fetchAll(), 'entregas originais preservadas por rollback');
echo "$total verificações de histórico aprovadas.\n";

<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||!in_array('--rollback',$argv,true))exit("Uso: php tests/integration/calendario_relacional.php --rollback\n");
require_once dirname(__DIR__,2).'/api/calendario/_calendario.php';
$pdo=primewayPdo();$total=0;
function checkCalendar(bool $ok,string $label):void {global $total;if(!$ok)throw new RuntimeException($label);echo "[OK] $label\n";$total++;}
function rejectCalendar(callable $fn,int $status,string $label):void {
    try{$fn();}catch(PrimewayCalendarError $e){checkCalendar($e->getCode()===$status,$label);return;}throw new RuntimeException('Aceitou: '.$label);
}
function calendarSnapshot(PDO $pdo):string {
    $data=[];foreach(['eventos_calendario','auditoria','notificacoes','notificacao_destinatarios','estado_aplicacao','turmas','matriculas','usuarios','disciplinas','turma_disciplinas'] as $table)
        $data[$table]=$pdo->query("SELECT * FROM $table ORDER BY id")->fetchAll();
    return hash('sha256',json_encode($data,JSON_THROW_ON_ERROR));
}
function calendarRouteSql(string $file,string $marker):string {
    foreach(token_get_all(file_get_contents(dirname(__DIR__,2).'/'.$file)) as $token) {
        if(!is_array($token)||$token[0]!==T_CONSTANT_ENCAPSED_STRING)continue;
        $sql=stripcslashes(substr($token[1],1,-1));if(str_contains(preg_replace('/\s+/',' ',$sql),$marker))return $sql;
    }throw new RuntimeException('SQL não encontrado: '.$file);
}
function calendarQuery(PDO $p,string $sql,array $params):array {$s=$p->prepare($sql);$s->execute($params);return $s->fetchAll();}
$before=calendarSnapshot($pdo);$initial=$pdo->query('SELECT * FROM eventos_calendario ORDER BY id')->fetchAll();
$admin=['perfil'=>'admin','id'=>(int)$pdo->query("SELECT id FROM usuarios WHERE perfil='admin' AND ativo=1 ORDER BY id LIMIT 1")->fetchColumn()];
$teachers=$pdo->query("SELECT p.id,u.id AS user_id FROM professores p JOIN usuarios u ON u.pessoa_id=p.pessoa_id WHERE u.perfil='professor' AND u.ativo=1 AND p.status='ativo'")->fetchAll();
$classes=$pdo->query('SELECT * FROM turmas ORDER BY id')->fetchAll();
$all=['inicio'=>'2026-01-01','fim'=>'2026-12-31'];
$pdo->beginTransaction();
try {
    if (in_array('--fixtures', $argv, true)) {
        if ($initial !== []) throw new RuntimeException('--fixtures exige calendário vazio; use o teste estrito para eventos existentes.');
        if ($classes === []) {
            $year=$pdo->query('SELECT id FROM anos_letivos WHERE ativo=1 ORDER BY id LIMIT 1')->fetchColumn();
            if (!$year || !$teachers) throw new RuntimeException('Necessários ano ativo e Professor existente.');
            $stmt=$pdo->prepare("INSERT INTO turmas (ano_letivo_id,nome,serie,turno,status,professor_id) VALUES (?,?,'Teste','Integral','Ativa',?)");
            $stmt->execute([$year,'Teste calendário regente',$teachers[0]['id']]);
            $stmt->execute([$year,'Teste calendário alheia',null]);
            $classes=$pdo->query('SELECT * FROM turmas ORDER BY id')->fetchAll();
            $pdo->prepare("INSERT INTO disciplinas (codigo,nome,area,status) VALUES (?,'Teste Calendário','Tecnologia','Ativa')")->execute(['TC'.bin2hex(random_bytes(4))]);
            $subject=(int)$pdo->lastInsertId();
            $pdo->prepare("INSERT INTO turma_disciplinas (turma_id,disciplina_id,professor_id,carga_horaria,status) VALUES (?,?,?,80,'Inativa')")->execute([$classes[1]['id'],$subject,$teachers[0]['id']]);
            $student=$pdo->query('SELECT aluno_id FROM aluno_responsavel WHERE ativo=1 ORDER BY id LIMIT 1')->fetchColumn();
            if ($student) $pdo->prepare("INSERT INTO matriculas (aluno_id,turma_id,data_matricula,situacao) VALUES (?,?,CURRENT_DATE,'Ativa')")->execute([$student,$classes[0]['id']]);
        }
        foreach (['Aviso'=>'Cancelado','Prova'=>'Concluído','Reunião'=>'Cancelado'] as $type=>$status) {
            $fixture=primewayCalendarSave($pdo,$admin,['title'=>'Histórico temporário '.$type,'type'=>$type,'date'=>'2026-03-10','classId'=>null]);
            primewayCalendarStatus($pdo,$admin,['id'=>$fixture['id'],'status'=>$status]);
        }
        $initial=$pdo->query('SELECT * FROM eventos_calendario ORDER BY id')->fetchAll();
        echo "[FIXTURES] Três eventos temporários; os eventos originais do outro computador não estão neste banco.\n";
    }
    $listed=primewayCalendarList($pdo,$admin,$all);
    checkCalendar(count($listed['events'])===3 && (in_array('--fixtures',$argv,true) || array_column($initial,'id')===[2,3,4]),'Admin vê os três eventos (IDs originais no modo estrito)');
    foreach($initial as $e)checkCalendar(primewayCalendarioBuscarEvento($pdo,(int)$e['id'])['title']===$e['titulo'],'contrato da Secretaria preserva evento '.$e['id']);
    $secretarySql=calendarRouteSql('api/secretaria/calendario/index.php','WHERE ec.data_evento BETWEEN');
    checkCalendar(count(calendarQuery($pdo,$secretarySql,['inicio'=>$all['inicio'],'fim'=>$all['fim']]))===3,'consulta real da Secretaria retorna os três eventos');
    checkCalendar($listed['upcoming']===[],'cancelados e concluídos não entram na agenda futura');
    $payload=['title'=>'Teste relacional rollback','type'=>'Evento','date'=>date('Y-m-d'),'timeStart'=>'09:00','timeEnd'=>'10:00','classId'=>null];
    $global=primewayCalendarSave($pdo,$admin,$payload);
    checkCalendar($global['id']>0&&$global['classId']===null&&$global['createdByUserId']===$admin['id'],'criação global com ID e criador do servidor');
    if (!$classes || !$teachers || !$admin['id']) throw new RuntimeException('Necessários Admin, Professor vinculado e turma existentes. Nenhum usuário será criado.');
    $byClass=[];foreach($classes as $c)$byClass[(int)$c['id']]=primewayCalendarSave($pdo,$admin,[...$payload,'classId'=>(int)$c['id'],'title'=>'Turma '.$c['id']]);
    checkCalendar(count($byClass)===count($classes),'criação por IDs reais de turma');
    foreach($teachers as $t) {
        $user=['perfil'=>'professor','id'=>(int)$t['user_id']];$result=primewayCalendarList($pdo,$user,$all);
        $allowed=array_map('intval',array_column(calendarQuery($pdo,'SELECT DISTINCT t.id FROM turmas t LEFT JOIN turma_disciplinas td ON td.turma_id=t.id WHERE t.professor_id=? OR td.professor_id=?',[$t['id'],$t['id']]),'id'));
        foreach($byClass as $classId=>$e)checkCalendar(in_array($e['id'],array_column($result['events'],'id'),true)===in_array($classId,$allowed,true),'escopo real do professor '.$t['id'].' / turma '.$classId);
        checkCalendar(in_array($global['id'],array_column($result['events'],'id'),true),'professor recebe global');
        rejectCalendar(fn()=>primewayCalendarSave($pdo,$user,$payload),403,'professor não cria');
        rejectCalendar(fn()=>primewayCalendarSave($pdo,$user,[...$payload,'id'=>$global['id']],true),403,'professor não edita');
        rejectCalendar(fn()=>primewayCalendarStatus($pdo,$user,['id'=>$global['id'],'status'=>'Cancelado']),403,'professor não muda status');
        foreach($allowed as $classId) {
            if (!isset($byClass[$classId])) continue;
            $pdo->prepare("UPDATE turmas SET status='Inativa' WHERE id=?")->execute([$classId]);
            $history=primewayCalendarList($pdo,$user,$all);
            checkCalendar(in_array($byClass[$classId]['id'],array_column($history['events'],'id'),true),'Professor mantém histórico de turma inativa');
            checkCalendar(!array_values(array_filter($history['classes'],fn($c)=>$c['id']===$classId))[0]['available'],'turma histórica indisponível para novos eventos');
            $pdo->prepare("UPDATE turmas SET status='Ativa' WHERE id=?")->execute([$classId]);
        }
        if (isset($subject) && $t['id']===$teachers[0]['id']) checkCalendar(in_array($byClass[(int)$classes[1]['id']]['id'],array_column($result['events'],'id'),true),'Professor recebe turma por disciplina, inclusive vínculo histórico inativo');
    }
    $pdo->prepare("INSERT INTO turmas (ano_letivo_id,nome,serie,turno,status) VALUES (?,?,'Teste','Integral','Ativa')")
        ->execute([$classes[0]['ano_letivo_id'],'Calendário '.bin2hex(random_bytes(4))]);
    $otherClass=(int)$pdo->lastInsertId();$other=primewayCalendarSave($pdo,$admin,[...$payload,'classId'=>$otherClass,'title'=>'Outra turma']);
    $alunoSql=calendarRouteSql('api/aluno/index.php',"WHERE e.status = 'Agendado'");
    $aluno=calendarQuery($pdo,$alunoSql,['turma_id'=>$classes[0]['id']]);
    checkCalendar(in_array($global['title'],array_column($aluno,'titulo'))&&in_array($byClass[(int)$classes[0]['id']]['title'],array_column($aluno,'titulo'))&&!in_array('Outra turma',array_column($aluno,'titulo')),'Aluno: SQL real retorna global + sua turma');
    $guardian=(int)$pdo->query('SELECT responsavel_id FROM aluno_responsavel WHERE ativo=1 ORDER BY id LIMIT 1')->fetchColumn();
    $guardianRows=calendarQuery($pdo,calendarRouteSql('api/responsavel/index.php','SELECT DISTINCT e.id'),['responsavel_id'=>$guardian]);
    checkCalendar(in_array($global['id'],array_column($guardianRows,'id'))&&!in_array($other['id'],array_column($guardianRows,'id')),'Responsável: global e sem evento de turma alheia');
    $guardianClasses=array_map('intval',array_column(calendarQuery($pdo,"SELECT DISTINCT m.turma_id FROM matriculas m JOIN aluno_responsavel ar ON ar.aluno_id=m.aluno_id WHERE ar.responsavel_id=? AND ar.ativo=1 AND m.situacao='Ativa'",[$guardian]),'turma_id'));
    foreach($byClass as $classId=>$e)checkCalendar(in_array($e['id'],array_column($guardianRows,'id'))===in_array($classId,$guardianClasses,true),'Responsável recebe somente turma de aluno vinculado');
    foreach (['aluno','responsavel'] as $role) {
        $user=['id'=>$admin['id'],'perfil'=>$role];
        rejectCalendar(fn()=>primewayCalendarList($pdo,$user,$all),403,$role.' não acessa calendário Admin/Professor');
        rejectCalendar(fn()=>primewayCalendarSave($pdo,$user,$payload),403,$role.' não cria evento');
        rejectCalendar(fn()=>primewayCalendarSave($pdo,$user,[...$payload,'id'=>$global['id']],true),403,$role.' não edita evento');
        rejectCalendar(fn()=>primewayCalendarStatus($pdo,$user,['id'=>$global['id'],'status'=>'Cancelado']),403,$role.' não altera status');
    }
    rejectCalendar(fn()=>primewayCalendarList($pdo,['perfil'=>'professor','id'=>$admin['id']],$all),403,'perfil informado não substitui vínculo real de Professor');
    foreach($teachers as $t) {
        $user=['perfil'=>'professor','id'=>(int)$t['user_id']];
        checkCalendar(primewayCalendarList($pdo,$user,[...$all,'classId'=>(string)$otherClass])['events']===[],'filtro adulterado não amplia escopo do Professor');
    }
    foreach([['title'=>''],['title'=>str_repeat('x',191)],['date'=>'2026-02-30'],['timeStart'=>'25:00'],['timeEnd'=>'08:00'],['timeStart'=>'','timeEnd'=>'10:00'],['type'=>'Privado'],['classId'=>true]] as $bad)
        rejectCalendar(fn()=>primewayCalendarSave($pdo,$admin,[...$payload,...$bad]),422,'validação PHP: '.array_key_first($bad));
    rejectCalendar(fn()=>primewayCalendarSave($pdo,$admin,[...$payload,'classId'=>2147483647]),404,'turma inexistente rejeitada');
    $pdo->prepare("UPDATE turmas SET status='Inativa' WHERE id=?")->execute([$otherClass]);
    rejectCalendar(fn()=>primewayCalendarSave($pdo,$admin,[...$payload,'classId'=>$otherClass]),409,'nova atribuição a turma inativa rejeitada');
    $edited=primewayCalendarSave($pdo,$admin,[...$payload,'id'=>$other['id'],'classId'=>$otherClass,'title'=>'Vínculo preservado'],true);
    checkCalendar($edited['classId']===$otherClass && $edited['classStatus']==='Inativa','edição mantém turma histórica inativa e retorna seu status');
    $incomplete=$payload;unset($incomplete['classId']);
    rejectCalendar(fn()=>primewayCalendarSave($pdo,$admin,[...$incomplete,'id'=>$other['id']],true),422,'omissão de turma não apaga vínculo');
    checkCalendar(count(primewayCalendarList($pdo,$admin,[...$all,'classId'=>(string)$otherClass])['events'])===1,'filtro por ID de turma preserva inativa');
    checkCalendar(count(primewayCalendarList($pdo,$admin,[...$all,'type'=>'Aviso'])['events'])===1,'filtro de tipo');
    checkCalendar(count(primewayCalendarList($pdo,$admin,[...$all,'status'=>'Cancelado'])['events'])===2,'filtro de status');
    $later=primewayCalendarList($pdo,$admin,['inicio'=>'2026-12-01','fim'=>'2026-12-31']);
    checkCalendar($later['events']===[],'intervalo não retorna eventos de outro mês');
    checkCalendar(count($pdo->query('SELECT id FROM eventos_calendario')->fetchAll())===count($initial)+count($byClass)+2,'consulta não exclui eventos fora do intervalo');
    foreach($initial as $e)rejectCalendar(fn()=>primewayCalendarSave($pdo,$admin,[...$payload,'id'=>$e['id']],true),409,'bloqueia edição de '.$e['status']);
    $done=primewayCalendarStatus($pdo,$admin,['id'=>$global['id'],'status'=>'Concluído']);
    $cancel=primewayCalendarStatus($pdo,$admin,['id'=>$other['id'],'status'=>'Cancelado']);
    checkCalendar($done['status']==='Concluído'&&$cancel['status']==='Cancelado','concluir e cancelar mantêm os registros');
    rejectCalendar(fn()=>primewayCalendarStatus($pdo,$admin,['id'=>$global['id'],'status'=>'Agendado']),422,'não reativa status encerrado');
    $past=primewayCalendarSave($pdo,$admin,[...$payload,'date'=>'2026-01-01']);checkCalendar($past['status']==='Agendado','data passada não conclui automaticamente');
    $audit=calendarQuery($pdo,"SELECT acao,dados_anteriores,dados_novos FROM auditoria WHERE entidade='eventos_calendario' AND registro_id=?",[$global['id']]);
    checkCalendar(array_column($audit,'acao')===['CRIAR_EVENTO','ALTERAR_STATUS_EVENTO'],'auditoria de criação e mudança de status');
    $audit=calendarQuery($pdo,"SELECT dados_anteriores,dados_novos FROM auditoria WHERE entidade='eventos_calendario' AND registro_id=? AND acao='ALTERAR_EVENTO'",[$other['id']]);
    checkCalendar(count($audit)===1&&json_decode($audit[0]['dados_novos'],true)['turma_id']===$otherClass,'auditoria de edição mantém vínculo');
    $originalIds=implode(',',array_map('intval',array_column($initial,'id')));
    checkCalendar($initial===$pdo->query("SELECT * FROM eventos_calendario WHERE id IN ($originalIds) ORDER BY id")->fetchAll(),'três registros iniciais exatamente preservados');
} finally {$pdo->rollBack();}
checkCalendar(calendarSnapshot($pdo)===$before,'rollback preservou calendário, turmas, auditoria, notificações e estado');
echo "$total verificações aprovadas.\n";
